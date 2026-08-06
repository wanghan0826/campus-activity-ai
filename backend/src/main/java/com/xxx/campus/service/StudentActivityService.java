package com.xxx.campus.service;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ActivityRegistration;
import com.xxx.campus.model.StudentActivityView;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StudentActivityService {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_CANCELLED = "CANCELLED";
    private static final List<String> ACTIVE_STATUSES = List.of(STATUS_PENDING, STATUS_APPROVED);
    private static final Set<String> ALLOWED_CATEGORIES = Set.of("ART", "SPORTS", "PRACTICE", "LIFE", "FEATURE");

    private final ActivityRepository activityRepository;
    private final ActivityRegistrationRepository registrationRepository;

    @Transactional(readOnly = true)
    public Page<StudentActivityView> listPublishedActivities(String studentId, String category, String keyword, int page, int size) {
        String normalizedCategory = normalizeCategory(category);
        String normalizedKeyword = normalizeFilter(keyword);
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return activityRepository.searchPublishedActivities(normalizedCategory, normalizedKeyword, LocalDateTime.now(), pageable)
                .map(activity -> toView(activity, studentId));
    }

    @Transactional(readOnly = true)
    public StudentActivityView getPublishedActivity(Long activityId, String studentId) {
        Activity activity = getPublished(activityId);
        return toView(activity, studentId);
    }

    @Transactional(readOnly = true)
    public List<StudentActivityView> listMyRegistrations(String studentId) {
        return registrationRepository.findByStudentIdOrderByUpdatedAtDesc(studentId).stream()
                .map(registration -> toView(registration.getActivity(), studentId))
                .toList();
    }

    @Transactional
    public StudentActivityView register(Long activityId, String studentId) {
        Activity activity = activityRepository.findByIdForUpdate(activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        ensurePublished(activity);

        Optional<ActivityRegistration> existing = registrationRepository.findByActivityIdAndStudentId(activityId, studentId);
        if (existing.isPresent() && ACTIVE_STATUSES.contains(existing.get().getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "你已经报名该活动");
        }

        RegistrationAvailability availability = availability(activity, null);
        if (!availability.canRegister()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, availability.notice());
        }

        String nextStatus = Boolean.TRUE.equals(activity.getRegistrationApprovalRequired())
                ? STATUS_PENDING
                : STATUS_APPROVED;
        ActivityRegistration registration = existing.orElseGet(ActivityRegistration::new);
        registration.setActivity(activity);
        registration.setStudentId(studentId);
        registration.setStatus(nextStatus);
        registrationRepository.save(registration);
        registrationRepository.flush();
        return toView(activity, studentId);
    }

    @Transactional
    public StudentActivityView cancel(Long activityId, String studentId) {
        ActivityRegistration registration = registrationRepository.findByActivityIdAndStudentId(activityId, studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "未找到报名记录"));
        if (!ACTIVE_STATUSES.contains(registration.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "当前报名已取消");
        }
        if (Boolean.TRUE.equals(registration.getCheckedIn())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "已经完成签到，无法取消报名");
        }
        Activity activity = registration.getActivity();
        if (activity.getStartTime() != null && !LocalDateTime.now().isBefore(activity.getStartTime())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "活动已经开始，无法取消报名");
        }
        registration.setStatus(STATUS_CANCELLED);
        registrationRepository.save(registration);
        return toView(activity, studentId);
    }

    @Transactional
    public StudentActivityView checkIn(Long activityId, String studentId, String code) {
        Activity activity = activityRepository.findByIdForUpdate(activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        ensurePublished(activity);
        ActivityRegistration registration = registrationRepository.findByActivityIdAndStudentId(activityId, studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "请先报名活动"));
        if (!STATUS_APPROVED.equals(registration.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "报名尚未通过，暂时不能签到");
        }
        if (Boolean.TRUE.equals(registration.getCheckedIn())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "你已经完成签到");
        }
        if (!"QR".equals(activity.getCheckInMode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "请到现场工作人员处签到");
        }
        if (!Boolean.TRUE.equals(activity.getCheckInOpen())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "签到尚未开放");
        }
        if (!sameCode(activity.getCheckInCode(), code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "签到码不正确");
        }
        registration.setCheckedIn(true);
        registration.setCheckedInAt(LocalDateTime.now());
        registration.setCheckInMethod("SELF_CODE");
        registration.setCheckedInBy(studentId);
        registrationRepository.save(registration);
        return toView(activity, studentId);
    }

    private StudentActivityView toView(Activity activity, String studentId) {
        ActivityRegistration registration = registrationRepository.findByActivityIdAndStudentId(activity.getId(), studentId)
                .orElse(null);
        long registeredCount = registrationRepository.countByActivityIdAndStatusIn(activity.getId(), ACTIVE_STATUSES);
        String registrationStatus = registration == null ? null : registration.getStatus();
        RegistrationAvailability availability = availability(activity, registrationStatus);
        CheckInAvailability checkInAvailability = checkInAvailability(activity, registration);

        return StudentActivityView.builder()
                .id(activity.getId())
                .title(activity.getTitle())
                .category(activity.getCategory())
                .campus(activity.getCampus())
                .location(activity.getLocation())
                .organizer(activity.getOrganizer())
                .coverImage(activity.getCoverImage())
                .content(activity.getContent())
                .targetAudience(activity.getTargetAudience())
                .contactInfo(activity.getContactInfo())
                .startTime(activity.getStartTime())
                .endTime(activity.getEndTime())
                .regStartTime(activity.getRegStartTime())
                .regEndTime(activity.getRegEndTime())
                .maxParticipants(activity.getMaxParticipants())
                .registrationRequired(activity.getRegistrationRequired())
                .registrationApprovalRequired(activity.getRegistrationApprovalRequired())
                .recognitionType(activity.getRecognitionType())
                .secondClassCredits(activity.getSecondClassCredits())
                .volunteerHours(activity.getVolunteerHours())
                .checkInMode(activity.getCheckInMode())
                .checkInOpen(Boolean.TRUE.equals(activity.getCheckInOpen()))
                .participationRequirements(activity.getParticipationRequirements())
                .schedule(activity.getSchedule())
                .materials(activity.getMaterials())
                .registeredCount(registeredCount)
                .registrationStatus(registrationStatus)
                .registeredAt(registration == null ? null : registration.getCreatedAt())
                .canRegister(availability.canRegister())
                .registrationNotice(availability.notice())
                .checkedIn(registration != null && Boolean.TRUE.equals(registration.getCheckedIn()))
                .checkedInAt(registration == null ? null : registration.getCheckedInAt())
                .canCheckIn(checkInAvailability.canCheckIn())
                .checkInNotice(checkInAvailability.notice())
                .build();
    }

    private CheckInAvailability checkInAvailability(Activity activity, ActivityRegistration registration) {
        if (registration != null && Boolean.TRUE.equals(registration.getCheckedIn())) {
            return new CheckInAvailability(false, "已完成签到");
        }
        if (registration == null || !STATUS_APPROVED.equals(registration.getStatus())) {
            return new CheckInAvailability(false, "报名成功后方可签到");
        }
        if ("NONE".equals(activity.getCheckInMode())) {
            return new CheckInAvailability(false, "本活动无需签到");
        }
        if ("MANUAL".equals(activity.getCheckInMode())) {
            return new CheckInAvailability(false, "请到现场工作人员处签到");
        }
        if (!Boolean.TRUE.equals(activity.getCheckInOpen())) {
            return new CheckInAvailability(false, "签到尚未开放");
        }
        return new CheckInAvailability(true, "输入现场签到码完成签到");
    }

    private RegistrationAvailability availability(Activity activity, String registrationStatus) {
        if (registrationStatus != null && ACTIVE_STATUSES.contains(registrationStatus)) {
            return new RegistrationAvailability(false, STATUS_PENDING.equals(registrationStatus) ? "报名待审核" : "已报名成功");
        }
        if (!Boolean.TRUE.equals(activity.getRegistrationRequired())) {
            return new RegistrationAvailability(false, "本活动无需报名，可直接参加");
        }
        if (!"PUBLISHED".equals(activity.getStatus())) {
            return new RegistrationAvailability(false, "活动暂未开放");
        }

        LocalDateTime now = LocalDateTime.now();
        if (activity.getOfflineTime() != null && !activity.getOfflineTime().isAfter(now)) {
            return new RegistrationAvailability(false, "活动已下架");
        }
        if (activity.getRegStartTime() != null && now.isBefore(activity.getRegStartTime())) {
            return new RegistrationAvailability(false, "报名尚未开始");
        }
        if (activity.getRegEndTime() != null && now.isAfter(activity.getRegEndTime())) {
            return new RegistrationAvailability(false, "报名已经截止");
        }
        if (activity.getStartTime() != null && now.isAfter(activity.getStartTime())) {
            return new RegistrationAvailability(false, "活动已经开始");
        }
        if (activity.getMaxParticipants() != null && activity.getMaxParticipants() > 0) {
            long count = registrationRepository.countByActivityIdAndStatusIn(activity.getId(), ACTIVE_STATUSES);
            if (count >= activity.getMaxParticipants()) {
                return new RegistrationAvailability(false, "报名名额已满");
            }
        }
        return new RegistrationAvailability(true, Boolean.TRUE.equals(activity.getRegistrationApprovalRequired()) ? "提交后等待审核" : "可立即报名");
    }

    private Activity getPublished(Long activityId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        ensurePublished(activity);
        return activity;
    }

    private void ensurePublished(Activity activity) {
        if (!"PUBLISHED".equals(activity.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "活动尚未发布");
        }
        if (activity.getOfflineTime() != null && !activity.getOfflineTime().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "活动已下架");
        }
    }

    private String normalizeCategory(String category) {
        String normalized = normalizeFilter(category);
        if (normalized != null && !ALLOWED_CATEGORIES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "活动分类不正确");
        }
        return normalized;
    }

    private String normalizeFilter(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private boolean sameCode(String expected, String actual) {
        if (expected == null || actual == null) return false;
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.trim().getBytes(StandardCharsets.UTF_8)
        );
    }

    private record RegistrationAvailability(boolean canRegister, String notice) {}
    private record CheckInAvailability(boolean canCheckIn, String notice) {}
}
