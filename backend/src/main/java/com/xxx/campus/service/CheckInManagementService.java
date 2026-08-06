package com.xxx.campus.service;

import com.xxx.campus.model.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CheckInManagementService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final DateTimeFormatter CSV_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ActivityRepository activityRepository;
    private final ActivityRegistrationRepository registrationRepository;
    private final UserAccountRepository userAccountRepository;

    @Transactional(readOnly = true)
    public CheckInRosterView getRoster(Long activityId, String creatorId) {
        Activity activity = getOwnedActivity(activityId, creatorId);
        List<ActivityRegistration> registrations = registrationRepository.findByActivityIdOrderByCreatedAtAsc(activityId);
        Set<String> studentIds = registrations.stream()
                .map(ActivityRegistration::getStudentId)
                .collect(Collectors.toSet());
        Map<String, UserAccount> users = userAccountRepository.findByUserIdIn(studentIds).stream()
                .collect(Collectors.toMap(UserAccount::getUserId, Function.identity()));

        List<RegistrationRosterItem> items = registrations.stream()
                .map(registration -> toRosterItem(registration, users.get(registration.getStudentId())))
                .toList();
        long approved = countStatus(items, StudentActivityService.STATUS_APPROVED);
        long pending = countStatus(items, StudentActivityService.STATUS_PENDING);
        long cancelled = countStatus(items, StudentActivityService.STATUS_CANCELLED);
        long checkedIn = items.stream().filter(RegistrationRosterItem::isCheckedIn).count();

        return CheckInRosterView.builder()
                .activityId(activity.getId())
                .activityTitle(activity.getTitle())
                .location(activity.getLocation())
                .startTime(activity.getStartTime())
                .endTime(activity.getEndTime())
                .checkInMode(activity.getCheckInMode())
                .checkInOpen(Boolean.TRUE.equals(activity.getCheckInOpen()))
                .checkInCode(activity.getCheckInCode())
                .checkInOpenedAt(activity.getCheckInOpenedAt())
                .totalCount(approved + pending)
                .approvedCount(approved)
                .pendingCount(pending)
                .cancelledCount(cancelled)
                .checkedInCount(checkedIn)
                .absentCount(Math.max(approved - checkedIn, 0))
                .registrations(items)
                .build();
    }

    @Transactional
    public CheckInRosterView openCheckIn(Long activityId, String creatorId) {
        Activity activity = getOwnedActivity(activityId, creatorId);
        if (!"PUBLISHED".equals(activity.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "只有已发布活动可以开启签到");
        }
        if ("NONE".equals(activity.getCheckInMode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "该活动设置为无需签到");
        }
        if (!Boolean.TRUE.equals(activity.getCheckInOpen())) {
            activity.setCheckInCode("QR".equals(activity.getCheckInMode()) ? generateCode() : null);
            activity.setCheckInOpenedAt(LocalDateTime.now());
            activity.setCheckInOpen(true);
            activityRepository.save(activity);
        }
        return getRoster(activityId, creatorId);
    }

    @Transactional
    public CheckInRosterView closeCheckIn(Long activityId, String creatorId) {
        Activity activity = getOwnedActivity(activityId, creatorId);
        activity.setCheckInOpen(false);
        activityRepository.save(activity);
        return getRoster(activityId, creatorId);
    }

    @Transactional
    public CheckInRosterView manualCheckIn(Long activityId, Long registrationId, String creatorId) {
        Activity activity = getOwnedActivity(activityId, creatorId);
        if ("NONE".equals(activity.getCheckInMode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "该活动设置为无需签到");
        }
        ActivityRegistration registration = getRegistration(activityId, registrationId);
        ensureApproved(registration);
        registration.setCheckedIn(true);
        registration.setCheckedInAt(LocalDateTime.now());
        registration.setCheckInMethod("MANUAL");
        registration.setCheckedInBy(creatorId);
        registrationRepository.save(registration);
        return getRoster(activityId, creatorId);
    }

    @Transactional
    public CheckInRosterView undoCheckIn(Long activityId, Long registrationId, String creatorId) {
        getOwnedActivity(activityId, creatorId);
        ActivityRegistration registration = getRegistration(activityId, registrationId);
        registration.setCheckedIn(false);
        registration.setCheckedInAt(null);
        registration.setCheckInMethod(null);
        registration.setCheckedInBy(null);
        registrationRepository.save(registration);
        return getRoster(activityId, creatorId);
    }

    @Transactional(readOnly = true)
    public byte[] exportCsv(Long activityId, String creatorId) {
        CheckInRosterView roster = getRoster(activityId, creatorId);
        StringBuilder csv = new StringBuilder("\uFEFF");
        csv.append("序号,学号/工号,姓名,学院,报名状态,报名时间,签到状态,签到时间,签到方式,现场签名\r\n");
        int index = 1;
        for (RegistrationRosterItem item : roster.getRegistrations()) {
            csv.append(index++).append(',')
                    .append(cell(item.getStudentId())).append(',')
                    .append(cell(item.getStudentName())).append(',')
                    .append(cell(item.getCollegeName())).append(',')
                    .append(cell(statusLabel(item.getRegistrationStatus()))).append(',')
                    .append(cell(formatTime(item.getRegisteredAt()))).append(',')
                    .append(cell(item.isCheckedIn() ? "已签到" : "未签到")).append(',')
                    .append(cell(formatTime(item.getCheckedInAt()))).append(',')
                    .append(cell(methodLabel(item.getCheckInMethod()))).append(',')
                    .append("\r\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private RegistrationRosterItem toRosterItem(ActivityRegistration registration, UserAccount user) {
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
                .build();
    }

    private Activity getOwnedActivity(Long activityId, String creatorId) {
        return activityRepository.findByIdAndCreatorId(activityId, creatorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "活动不存在或无权访问"));
    }

    private ActivityRegistration getRegistration(Long activityId, Long registrationId) {
        return registrationRepository.findByIdAndActivityId(registrationId, activityId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "报名记录不存在"));
    }

    private void ensureApproved(ActivityRegistration registration) {
        if (!StudentActivityService.STATUS_APPROVED.equals(registration.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "只有报名成功的学生可以签到");
        }
    }

    private long countStatus(List<RegistrationRosterItem> items, String status) {
        return items.stream().filter(item -> status.equals(item.getRegistrationStatus())).count();
    }

    private String generateCode() {
        return String.format(Locale.ROOT, "%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private String formatTime(LocalDateTime value) {
        return value == null ? "" : value.format(CSV_TIME);
    }

    private String statusLabel(String status) {
        return switch (status) {
            case StudentActivityService.STATUS_APPROVED -> "报名成功";
            case StudentActivityService.STATUS_PENDING -> "待审核";
            case StudentActivityService.STATUS_CANCELLED -> "已取消";
            default -> status == null ? "" : status;
        };
    }

    private String methodLabel(String method) {
        if ("SELF_CODE".equals(method)) return "学生现场签到";
        if ("MANUAL".equals(method)) return "工作人员签到";
        return "";
    }

    private String cell(String value) {
        String safe = value == null ? "" : value;
        if (!safe.isEmpty() && "=+-@".indexOf(safe.charAt(0)) >= 0) safe = "'" + safe;
        return '"' + safe.replace("\"", "\"\"") + '"';
    }
}
