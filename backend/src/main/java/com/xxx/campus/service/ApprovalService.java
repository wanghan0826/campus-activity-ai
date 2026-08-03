package com.xxx.campus.service;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ApprovalRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** 发布人、学院审核老师、学院领导三级流转中的审批业务。 */
@Service
@RequiredArgsConstructor
public class ApprovalService {

    public static final String ROLE_PUBLISHER = "PUBLISHER";
    public static final String ROLE_COLLEGE_REVIEWER = "COLLEGE_REVIEWER";
    public static final String ROLE_COLLEGE_LEADER = "COLLEGE_LEADER";

    public static final String STAGE_PUBLISHER = "PUBLISHER";
    public static final String STAGE_COLLEGE_REVIEWER = "COLLEGE_REVIEWER";
    public static final String STAGE_COLLEGE_LEADER = "COLLEGE_LEADER";
    public static final String STAGE_COMPLETED = "COMPLETED";
    public static final String STAGE_REJECTED = "REJECTED";

    private static final Map<String, String> ROLE_STAGE = Map.of(
            ROLE_COLLEGE_REVIEWER, STAGE_COLLEGE_REVIEWER,
            ROLE_COLLEGE_LEADER, STAGE_COLLEGE_LEADER
    );

    private final ActivityRepository activityRepository;
    private final ApprovalRecordRepository approvalRecordRepository;
    private final WeComMessageService weComMessageService;

    @Transactional(readOnly = true)
    public Page<Activity> listPendingTasks(String role, String college, String keyword, int page, int size) {
        String stage = stageForRole(role);
        String normalizedCollege = requireCollege(college);
        String normalizedKeyword = isBlank(keyword) ? null : keyword.trim();
        return activityRepository.searchApprovalTasks(
                stage,
                normalizedCollege,
                normalizedKeyword,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100))
        );
    }

    @Transactional(readOnly = true)
    public List<ApprovalRecord> getHistory(Long activityId, String userId, String role, String college) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        boolean isCreator = activity.getCreatorId().equals(userId);
        boolean isCollegeApprover = ROLE_STAGE.containsKey(normalizeRole(role))
                && !isBlank(college)
                && college.trim().equals(activity.getReviewDept());
        if (!isCreator && !isCollegeApprover) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权查看该活动的审批记录");
        }
        return approvalRecordRepository.findByActivityIdOrderByCreatedAtAscIdAsc(activityId);
    }

    @Transactional
    public Activity approve(Long activityId, String comment, String operatorId, String role, String college) {
        Activity activity = getAndAuthorizePendingTask(activityId, role, college);
        String normalizedRole = normalizeRole(role);
        LocalDateTime now = LocalDateTime.now();

        if (ROLE_COLLEGE_REVIEWER.equals(normalizedRole)) {
            activity.setReviewTeacher(operatorId);
            activity.setTeacherReviewedAt(now);
            activity.setApprovalStage(STAGE_COLLEGE_LEADER);
        } else {
            activity.setReviewLeader(operatorId);
            activity.setLeaderReviewedAt(now);
            activity.setApprovedAt(now);
            activity.setApprovalStage(STAGE_COMPLETED);
            activity.setStatus("APPROVED");
        }

        record(activity, activity.getApprovalStage().equals(STAGE_COLLEGE_LEADER)
                        ? STAGE_COLLEGE_REVIEWER : STAGE_COLLEGE_LEADER,
                "APPROVED", operatorId, normalizedRole, comment);
        Activity saved = activityRepository.save(activity);
        if (ROLE_COLLEGE_LEADER.equals(normalizedRole)) {
            weComMessageService.notifyApproved(saved);
        }
        return saved;
    }

    @Transactional
    public Activity reject(Long activityId, String comment, String operatorId, String role, String college) {
        if (isBlank(comment)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "驳回时必须填写原因");
        }
        Activity activity = getAndAuthorizePendingTask(activityId, role, college);
        String normalizedRole = normalizeRole(role);
        String rejectedStep = stageForRole(normalizedRole);
        LocalDateTime now = LocalDateTime.now();

        if (ROLE_COLLEGE_REVIEWER.equals(normalizedRole)) {
            activity.setReviewTeacher(operatorId);
            activity.setTeacherReviewedAt(now);
        } else {
            activity.setReviewLeader(operatorId);
            activity.setLeaderReviewedAt(now);
        }
        activity.setApprovalStage(STAGE_REJECTED);
        activity.setStatus("REJECTED");
        record(activity, rejectedStep, "REJECTED", operatorId, normalizedRole, comment);

        Activity saved = activityRepository.save(activity);
        weComMessageService.notifyRejected(saved, comment.trim());
        return saved;
    }

    @Transactional
    public void recordSubmission(Activity activity, String operatorId, String comment) {
        record(activity, STAGE_PUBLISHER, "SUBMITTED", operatorId, ROLE_PUBLISHER, comment);
    }

    private Activity getAndAuthorizePendingTask(Long activityId, String role, String college) {
        String expectedStage = stageForRole(role);
        String normalizedCollege = requireCollege(college);
        Activity activity = activityRepository.findByIdForUpdate(activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        if (!normalizedCollege.equals(activity.getReviewDept())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只能审批本学院的活动");
        }
        if (!"PENDING_APPROVAL".equals(activity.getStatus())
                || !expectedStage.equals(activity.getApprovalStage())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "该活动已处理或尚未流转到当前审批节点");
        }
        return activity;
    }

    private void record(Activity activity, String step, String action, String operatorId,
                        String operatorRole, String comment) {
        approvalRecordRepository.save(ApprovalRecord.builder()
                .activityId(activity.getId())
                .approvalRound(activity.getApprovalRound())
                .step(step)
                .action(action)
                .operatorId(operatorId)
                .operatorRole(operatorRole)
                .comment(trimToNull(comment))
                .build());
    }

    private String stageForRole(String role) {
        String stage = ROLE_STAGE.get(normalizeRole(role));
        if (stage == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "当前角色没有审批权限");
        }
        return stage;
    }

    private String normalizeRole(String role) {
        return isBlank(role) ? "" : role.trim().toUpperCase(Locale.ROOT);
    }

    private String requireCollege(String college) {
        if (isBlank(college)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "未识别到所属学院");
        }
        return college.trim();
    }

    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
