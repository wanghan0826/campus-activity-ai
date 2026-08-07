package com.xxx.campus.service;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ActivityRegistration;
import com.xxx.campus.model.RegistrationManagementView;
import com.xxx.campus.model.RegistrationRosterItem;
import com.xxx.campus.model.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RegistrationManagementService {

    private final ActivityRepository activityRepository;
    private final ActivityRegistrationRepository registrationRepository;
    private final UserAccountRepository userAccountRepository;

    @Transactional(readOnly = true)
    public RegistrationManagementView getRegistrations(Long activityId, String creatorId) {
        Activity activity = getOwnedActivity(activityId, creatorId);
        List<ActivityRegistration> registrations = registrationRepository.findByActivityIdOrderByCreatedAtAsc(activityId);
        Set<String> userIds = registrations.stream()
                .map(ActivityRegistration::getStudentId)
                .collect(Collectors.toSet());
        Map<String, UserAccount> users = userAccountRepository.findByUserIdIn(userIds).stream()
                .collect(Collectors.toMap(UserAccount::getUserId, Function.identity()));
        List<RegistrationRosterItem> items = registrations.stream()
                .map(registration -> toItem(registration, users.get(registration.getStudentId())))
                .toList();

        long approved = count(items, StudentActivityService.STATUS_APPROVED);
        long pending = count(items, StudentActivityService.STATUS_PENDING);
        long rejected = count(items, StudentActivityService.STATUS_REJECTED);
        long cancelled = count(items, StudentActivityService.STATUS_CANCELLED);
        Long remaining = activity.getMaxParticipants() == null || activity.getMaxParticipants() <= 0
                ? null
                : Math.max((long) activity.getMaxParticipants() - approved, 0L);

        return RegistrationManagementView.builder()
                .activityId(activity.getId())
                .activityTitle(activity.getTitle())
                .location(activity.getLocation())
                .startTime(activity.getStartTime())
                .approvalRequired(Boolean.TRUE.equals(activity.getRegistrationApprovalRequired()))
                .maxParticipants(activity.getMaxParticipants())
                .remainingCapacity(remaining)
                .applicationCount(items.size())
                .approvedCount(approved)
                .pendingCount(pending)
                .rejectedCount(rejected)
                .cancelledCount(cancelled)
                .registrations(items)
                .build();
    }

    @Transactional
    public RegistrationManagementView approve(Long activityId, Long registrationId, String creatorId, String comment) {
        Activity activity = getOwnedActivityForUpdate(activityId, creatorId);
        ensureReviewMode(activity);
        ActivityRegistration registration = getPendingRegistration(activityId, registrationId);
        long approved = registrationRepository.countByActivityIdAndStatus(
                activityId, StudentActivityService.STATUS_APPROVED);
        if (activity.getMaxParticipants() != null && activity.getMaxParticipants() > 0
                && approved >= activity.getMaxParticipants()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "正式名额已满，无法继续通过报名");
        }
        registration.setStatus(StudentActivityService.STATUS_APPROVED);
        applyReview(registration, creatorId, comment);
        registrationRepository.save(registration);
        return getRegistrations(activityId, creatorId);
    }

    @Transactional
    public RegistrationManagementView reject(Long activityId, Long registrationId, String creatorId, String comment) {
        Activity activity = getOwnedActivityForUpdate(activityId, creatorId);
        ensureReviewMode(activity);
        if (comment == null || comment.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请填写拒绝原因");
        }
        ActivityRegistration registration = getPendingRegistration(activityId, registrationId);
        registration.setStatus(StudentActivityService.STATUS_REJECTED);
        applyReview(registration, creatorId, comment);
        registrationRepository.save(registration);
        return getRegistrations(activityId, creatorId);
    }

    private RegistrationRosterItem toItem(ActivityRegistration registration, UserAccount user) {
        return RegistrationRosterItem.builder()
                .registrationId(registration.getId())
                .studentId(registration.getStudentId())
                .studentName(user == null ? "未匹配用户" : user.getDisplayName())
                .collegeCode(user == null ? "" : user.getCollegeCode())
                .collegeName(user == null ? "" : user.getCollegeName())
                .registrationStatus(registration.getStatus())
                .registeredAt(registration.getCreatedAt())
                .checkedIn(Boolean.TRUE.equals(registration.getCheckedIn()))
                .checkedInAt(registration.getCheckedInAt())
                .checkInMethod(registration.getCheckInMethod())
                .checkedInBy(registration.getCheckedInBy())
                .reviewedAt(registration.getReviewedAt())
                .reviewedBy(registration.getReviewedBy())
                .reviewComment(registration.getReviewComment())
                .build();
    }

    private Activity getOwnedActivity(Long activityId, String creatorId) {
        return activityRepository.findByIdAndCreatorId(activityId, creatorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在或无权访问"));
    }

    private Activity getOwnedActivityForUpdate(Long activityId, String creatorId) {
        Activity activity = activityRepository.findByIdForUpdate(activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在"));
        if (!creatorId.equals(activity.getCreatorId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在或无权访问");
        }
        return activity;
    }

    private ActivityRegistration getPendingRegistration(Long activityId, Long registrationId) {
        ActivityRegistration registration = registrationRepository.findByIdAndActivityId(registrationId, activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "报名记录不存在"));
        if (!StudentActivityService.STATUS_PENDING.equals(registration.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "该报名已处理或已由学生取消");
        }
        return registration;
    }

    private void ensureReviewMode(Activity activity) {
        if (!Boolean.TRUE.equals(activity.getRegistrationApprovalRequired())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "该活动为先到先得，无需人工审核");
        }
        if (!"PUBLISHED".equals(activity.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "只有已发布活动可以审核报名");
        }
    }

    private void applyReview(ActivityRegistration registration, String creatorId, String comment) {
        registration.setReviewedAt(LocalDateTime.now());
        registration.setReviewedBy(creatorId);
        registration.setReviewComment(comment == null || comment.isBlank() ? null : comment.trim());
    }

    private long count(List<RegistrationRosterItem> items, String status) {
        return items.stream().filter(item -> status.equals(item.getRegistrationStatus())).count();
    }
}
