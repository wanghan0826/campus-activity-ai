package com.xxx.campus.service;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ActivityParsedResult;
import com.xxx.campus.model.ActivityScheduleItem;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 活动创建、草稿管理与审批提交业务。
 */
@Service
@RequiredArgsConstructor
public class ActivityService {

    private static final Set<String> ALLOWED_CATEGORIES = Set.of("ART", "SPORTS", "PRACTICE", "LIFE", "FEATURE");
    private static final Set<String> ALLOWED_RECOGNITION_TYPES = Set.of("NONE", "CREDIT", "VOLUNTEER", "BOTH");
    private static final Set<String> ALLOWED_CHECK_IN_MODES = Set.of("QR", "MANUAL", "NONE");
    private static final Set<String> EDITABLE_STATUSES = Set.of("DRAFT", "REJECTED");
    private static final List<String> MANAGED_STATUSES = List.of(
            "DRAFT", "PENDING_APPROVAL", "APPROVED", "PUBLISHED", "OFFLINE", "REJECTED"
    );

    private final AiService aiService;
    private final ActivityRepository activityRepository;

    public Map<String, Object> parseDocument(String document, String creatorId) {
        ActivityParsedResult result = aiService.parseActivity(document);
        result.setRawDocument(document);
        result.setCreationMode("AI");

        List<String> missingFields = collectMissingFields(result);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("passed", missingFields.isEmpty());
        response.put("result", result);
        response.put("missingFields", missingFields);
        response.put("clarificationQuestions", buildClarificationQuestions(result));
        return response;
    }

    @Transactional
    public Activity createActivity(ActivityParsedResult result, String creatorId) {
        Activity activity = new Activity();
        activity.setCreatorId(creatorId);
        activity.setStatus("DRAFT");
        activity.setReviewDept("待分配");
        activity.setReviewTeacher("待分配");
        activity.setReviewLeader("待分配");
        applyResult(activity, result);
        return activityRepository.save(activity);
    }

    @Transactional
    public Activity updateActivity(Long id, ActivityParsedResult result, String creatorId) {
        Activity activity = getOwnedActivity(id, creatorId);
        ensureEditable(activity);
        applyResult(activity, result);
        return activityRepository.save(activity);
    }

    @Transactional(readOnly = true)
    public Page<Activity> listActivities(String creatorId, String status, String keyword, int page, int size) {
        String normalizedStatus = normalizeFilter(status);
        String normalizedKeyword = normalizeFilter(keyword);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return activityRepository.searchOwnedActivities(creatorId, normalizedStatus, normalizedKeyword, pageable);
    }

    @Transactional(readOnly = true)
    public Activity getActivity(Long id, String creatorId) {
        return getOwnedActivity(id, creatorId);
    }

    @Transactional
    public Activity submitForApproval(Long id, String message, String creatorId) {
        Activity activity = getOwnedActivity(id, creatorId);
        ensureEditable(activity);
        validateForSubmission(activity);
        activity.setApprovalMessage(message == null ? null : message.trim());
        activity.setStatus("PENDING_APPROVAL");
        activity.setSubmittedAt(LocalDateTime.now());
        return activityRepository.save(activity);
    }

    @Transactional
    public Activity duplicateActivity(Long id, String creatorId) {
        Activity source = getOwnedActivity(id, creatorId);
        Activity copy = new Activity();
        copy.setCreatorId(creatorId);
        copy.setStatus("DRAFT");
        copy.setReviewDept("待分配");
        copy.setReviewTeacher("待分配");
        copy.setReviewLeader("待分配");
        copy.setTitle(defaultIfBlank(source.getTitle(), "未命名活动") + "（副本）");
        copy.setCategory(source.getCategory());
        copy.setCampus(source.getCampus());
        copy.setLocation(source.getLocation());
        copy.setOrganizer(source.getOrganizer());
        copy.setCoverImage(source.getCoverImage());
        copy.setCoverImagePrompt(source.getCoverImagePrompt());
        copy.setContent(source.getContent());
        copy.setRawDocument(source.getRawDocument());
        copy.setStartTime(source.getStartTime());
        copy.setEndTime(source.getEndTime());
        copy.setRegStartTime(source.getRegStartTime());
        copy.setRegEndTime(source.getRegEndTime());
        copy.setPublishTime(source.getPublishTime());
        copy.setOfflineTime(source.getOfflineTime());
        copy.setMaxParticipants(source.getMaxParticipants());
        copy.setBudget(source.getBudget());
        copy.setRegistrationRequired(source.getRegistrationRequired());
        copy.setRegistrationApprovalRequired(source.getRegistrationApprovalRequired());
        copy.setRecognitionType(source.getRecognitionType());
        copy.setSecondClassCredits(source.getSecondClassCredits());
        copy.setVolunteerHours(source.getVolunteerHours());
        copy.setCheckInMode(source.getCheckInMode());
        copy.setParticipationRequirements(source.getParticipationRequirements());
        copy.setTargetAudience(source.getTargetAudience());
        copy.setContactInfo(source.getContactInfo());
        copy.setCreationMode(source.getCreationMode());
        copy.setPromoApproved(source.getPromoApproved());
        copy.setSchedule(new ArrayList<>(source.getSchedule()));
        copy.setMaterials(new ArrayList<>(source.getMaterials()));
        return activityRepository.save(copy);
    }

    @Transactional
    public void deleteDraft(Long id, String creatorId) {
        Activity activity = getOwnedActivity(id, creatorId);
        ensureEditable(activity);
        activityRepository.delete(activity);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getStatusStats(String creatorId) {
        Map<String, Long> stats = new LinkedHashMap<>();
        MANAGED_STATUSES.forEach(status -> stats.put(status, 0L));
        activityRepository.countOwnedByStatus(creatorId).forEach(row ->
                stats.put((String) row[0], (Long) row[1])
        );
        stats.put("ALL", stats.values().stream().mapToLong(Long::longValue).sum());
        return stats;
    }

    private void applyResult(Activity activity, ActivityParsedResult result) {
        if (result == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "活动信息不能为空");
        }

        activity.setTitle(trimToNull(result.getTitle()));
        activity.setCategory(trimToNull(result.getCategory()));
        activity.setCampus(trimToNull(result.getCampus()));
        activity.setLocation(trimToNull(result.getLocation()));
        activity.setOrganizer(defaultIfBlank(result.getOrganizer(), "待定"));
        activity.setCoverImage(trimToNull(result.getCoverImage()));
        activity.setCoverImagePrompt(trimToNull(result.getCoverImagePrompt()));
        activity.setContent(trimToNull(result.getContent()));
        activity.setRawDocument(trimToNull(result.getRawDocument()));
        activity.setCreationMode(defaultIfBlank(result.getCreationMode(), "AI").toUpperCase());
        activity.setTargetAudience(trimToNull(result.getTargetAudience()));
        activity.setContactInfo(trimToNull(result.getContactInfo()));
        activity.setStartTime(parseTime(result.getStartTime(), "活动开始时间"));
        activity.setEndTime(parseTime(result.getEndTime(), "活动结束时间"));
        activity.setRegStartTime(parseTime(result.getRegStartTime(), "报名开始时间"));
        activity.setRegEndTime(parseTime(result.getRegEndTime(), "报名截止时间"));
        activity.setPublishTime(parseTime(result.getPublishTime(), "上架时间"));
        activity.setOfflineTime(parseTime(result.getOfflineTime(), "下架时间"));
        activity.setMaxParticipants(result.getMaxParticipants());
        activity.setBudget(result.getBudget());
        activity.setRegistrationRequired(result.getRegistrationRequired() == null || result.getRegistrationRequired());
        activity.setRegistrationApprovalRequired(Boolean.TRUE.equals(result.getRegistrationApprovalRequired()));
        activity.setRecognitionType(defaultIfBlank(result.getRecognitionType(), "NONE").toUpperCase());
        activity.setSecondClassCredits(result.getSecondClassCredits());
        activity.setVolunteerHours(result.getVolunteerHours());
        activity.setCheckInMode(defaultIfBlank(result.getCheckInMode(), "QR").toUpperCase());
        activity.setParticipationRequirements(trimToNull(result.getParticipationRequirements()));
        activity.setPromoApproved(result.getPromoApproved());
        activity.setSchedule(toSchedule(result.getSchedule()));
        activity.setMaterials(result.getMaterials() == null
                ? new ArrayList<>()
                : new ArrayList<>(result.getMaterials().stream().map(this::trimToNull).filter(value -> value != null).toList()));

        validateTimeOrder(activity, false);
        validateRecognitionSettings(activity, false);
    }

    private List<ActivityScheduleItem> toSchedule(List<ActivityParsedResult.ScheduleItem> items) {
        if (items == null) return new ArrayList<>();
        return new ArrayList<>(items.stream()
                .filter(item -> item != null && (trimToNull(item.getTime()) != null || trimToNull(item.getContent()) != null))
                .map(item -> new ActivityScheduleItem(trimToNull(item.getTime()), trimToNull(item.getContent())))
                .toList());
    }

    private void validateForSubmission(Activity activity) {
        List<String> missing = new ArrayList<>();
        if (isBlank(activity.getTitle())) missing.add("活动标题");
        if (isBlank(activity.getCategory())) missing.add("活动分类");
        if (isBlank(activity.getLocation())) missing.add("活动地点");
        if (isBlank(activity.getContent())) missing.add("活动简介");
        if (activity.getStartTime() == null) missing.add("开始时间");
        if (activity.getEndTime() == null) missing.add("结束时间");
        if (!missing.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请补齐后再提交：" + String.join("、", missing));
        }
        if (!ALLOWED_CATEGORIES.contains(activity.getCategory())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "活动分类不合法");
        }
        validateTimeOrder(activity, true);
        if (activity.getMaxParticipants() != null && activity.getMaxParticipants() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "人数上限必须大于 0");
        }
        if (activity.getBudget() != null && activity.getBudget().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "活动预算不能为负数");
        }
        validateRecognitionSettings(activity, true);
    }

    private void validateRecognitionSettings(Activity activity, boolean submission) {
        if (!ALLOWED_RECOGNITION_TYPES.contains(activity.getRecognitionType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "认定方式不合法");
        }
        if (!ALLOWED_CHECK_IN_MODES.contains(activity.getCheckInMode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "签到方式不合法");
        }
        if (activity.getSecondClassCredits() != null && activity.getSecondClassCredits().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "第二课堂学分不能为负数");
        }
        if (activity.getVolunteerHours() != null && activity.getVolunteerHours().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "志愿服务时长不能为负数");
        }
        if (!submission) return;
        if (("CREDIT".equals(activity.getRecognitionType()) || "BOTH".equals(activity.getRecognitionType()))
                && (activity.getSecondClassCredits() == null || activity.getSecondClassCredits().signum() <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请选择学分认定时，第二课堂学分必须大于 0");
        }
        if (("VOLUNTEER".equals(activity.getRecognitionType()) || "BOTH".equals(activity.getRecognitionType()))
                && (activity.getVolunteerHours() == null || activity.getVolunteerHours().signum() <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请选择志愿时长认定时，志愿服务时长必须大于 0");
        }
    }

    private void validateTimeOrder(Activity activity, boolean submission) {
        if (activity.getStartTime() != null && activity.getEndTime() != null
                && !activity.getEndTime().isAfter(activity.getStartTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "活动结束时间必须晚于开始时间");
        }
        if (activity.getRegStartTime() != null && activity.getRegEndTime() != null
                && activity.getRegEndTime().isBefore(activity.getRegStartTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "报名截止时间不能早于报名开始时间");
        }
        if (submission && activity.getRegEndTime() != null && activity.getStartTime() != null
                && activity.getRegEndTime().isAfter(activity.getStartTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "报名截止时间不能晚于活动开始时间");
        }
    }

    private List<String> collectMissingFields(ActivityParsedResult result) {
        List<String> missing = new ArrayList<>();
        if (isBlank(result.getTitle())) missing.add("title");
        if (isBlank(result.getLocation())) missing.add("location");
        if (isBlank(result.getStartTime())) missing.add("startTime");
        if (isBlank(result.getEndTime())) missing.add("endTime");
        return missing;
    }

    private List<String> buildClarificationQuestions(ActivityParsedResult result) {
        List<String> questions = new ArrayList<>();
        if (isBlank(result.getTargetAudience())) questions.add("主要面向哪些年级、专业或师生群体？");
        if (result.getMaxParticipants() == null) questions.add("活动是否有人数上限或预计参与规模？");
        if (result.getBudget() == null) questions.add("是否需要填写活动预算？如不需要可留空。");
        if (isBlank(result.getContactInfo())) questions.add("是否需要补充活动联系人及咨询方式？");
        return questions;
    }

    private Activity getOwnedActivity(Long id, String creatorId) {
        return activityRepository.findByIdAndCreatorId(id, creatorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在或无权访问"));
    }

    private void ensureEditable(Activity activity) {
        if (!EDITABLE_STATUSES.contains(activity.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "当前状态不允许修改或删除");
        }
    }

    private LocalDateTime parseTime(String value, String fieldName) {
        if (isBlank(value)) return null;
        try {
            return LocalDateTime.parse(value.trim(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + "格式不正确");
        }
    }

    private String normalizeFilter(String value) {
        return isBlank(value) || "ALL".equalsIgnoreCase(value) ? null : value.trim();
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return isBlank(value) ? defaultValue : value.trim();
    }

    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
