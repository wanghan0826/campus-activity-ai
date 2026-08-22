package com.xxx.campus.service;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ActivityParsedResult;
import com.xxx.campus.model.CheckInRequest;
import com.xxx.campus.model.OpenCheckInRequest;
import com.xxx.campus.model.StudentActivityView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StudentActivityServiceTest {

    @Autowired
    private ActivityService activityService;

    @Autowired
    private ApprovalService approvalService;

    @Autowired
    private StudentActivityService studentActivityService;

    @Autowired
    private CheckInManagementService checkInManagementService;

    @Autowired
    private RegistrationManagementService registrationManagementService;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private ActivityRegistrationRepository registrationRepository;

    @Autowired
    private ApprovalRecordRepository approvalRecordRepository;

    @BeforeEach
    void cleanDatabase() {
        registrationRepository.deleteAll();
        approvalRecordRepository.deleteAll();
        activityRepository.deleteAll();
    }

    @Test
    void shouldOnlyShowPublishedActivitiesAndSupportRegistrationLifecycle() {
        Activity published = publish(completeResult(true, 2));
        activityService.createActivity(completeResult(false, 20), "another_teacher");

        assertThat(studentActivityService.listPublishedActivities("student_001", null, null, 0, 20).getContent())
                .extracting(StudentActivityView::getId)
                .containsExactly(published.getId());

        StudentActivityView registered = studentActivityService.register(published.getId(), "student_001");
        assertThat(registered.getRegistrationStatus()).isEqualTo("PENDING");
        assertThat(registered.getRegisteredCount()).isZero();
        assertThat(registered.isCanRegister()).isFalse();

        assertThatThrownBy(() -> studentActivityService.register(published.getId(), "student_001"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("已经报名");

        StudentActivityView cancelled = studentActivityService.cancel(published.getId(), "student_001");
        assertThat(cancelled.getRegistrationStatus()).isEqualTo("CANCELLED");
        assertThat(cancelled.getRegisteredCount()).isZero();
        assertThat(cancelled.isCanRegister()).isTrue();

        StudentActivityView registeredAgain = studentActivityService.register(published.getId(), "student_001");
        assertThat(registeredAgain.getRegistrationStatus()).isEqualTo("PENDING");
        assertThat(studentActivityService.listMyRegistrations("student_001")).hasSize(1);
    }

    @Test
    void shouldShowPublishedActivityThatDoesNotRequireRegistration() {
        ActivityParsedResult result = completeResult(false, 20);
        result.setRegistrationRequired(false);
        result.setMaxParticipants(null);
        Activity published = publish(result);

        assertThat(studentActivityService.listPublishedActivities("student_001", null, null, 0, 20).getContent())
                .singleElement()
                .satisfies(view -> {
                    assertThat(view.getId()).isEqualTo(published.getId());
                    assertThat(view.getRegistrationRequired()).isFalse();
                    assertThat(view.isCanRegister()).isFalse();
                    assertThat(view.getRegistrationNotice()).contains("无需报名");
                });
    }

    @Test
    void shouldEnforceCapacityAndDirectlyApproveRegistration() {
        Activity published = publish(completeResult(false, 1));

        StudentActivityView first = studentActivityService.register(published.getId(), "student_001");
        assertThat(first.getRegistrationStatus()).isEqualTo("APPROVED");

        assertThatThrownBy(() -> studentActivityService.register(published.getId(), "student_002"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("名额已满");
    }

    @Test
    void shouldReviewRegistrationsAndOnlyCountApprovedStudentsAgainstCapacity() {
        Activity reviewed = publish(completeResult(true, 1));
        studentActivityService.register(reviewed.getId(), "student_001");
        studentActivityService.register(reviewed.getId(), "student_002");

        var initial = registrationManagementService.getRegistrations(
                reviewed.getId(), "publisher_test_001");
        assertThat(initial.isApprovalRequired()).isTrue();
        assertThat(initial.getPendingCount()).isEqualTo(2);
        assertThat(initial.getApprovedCount()).isZero();
        assertThat(initial.getRemainingCapacity()).isEqualTo(1);

        Long secondId = initial.getRegistrations().stream()
                .filter(item -> "student_002".equals(item.getStudentId()))
                .findFirst().orElseThrow().getRegistrationId();
        var rejected = registrationManagementService.reject(
                reviewed.getId(), secondId, "publisher_test_001", "材料不完整");
        assertThat(rejected.getRejectedCount()).isEqualTo(1);
        assertThat(studentActivityService.getPublishedActivity(reviewed.getId(), "student_002"))
                .satisfies(view -> {
                    assertThat(view.getRegistrationStatus()).isEqualTo("REJECTED");
                    assertThat(view.getRegistrationReviewComment()).isEqualTo("材料不完整");
                    assertThat(view.isCanRegister()).isTrue();
                });

        studentActivityService.register(reviewed.getId(), "student_002");
        var reapplied = registrationManagementService.getRegistrations(
                reviewed.getId(), "publisher_test_001");
        Long firstId = reapplied.getRegistrations().stream()
                .filter(item -> "student_001".equals(item.getStudentId()))
                .findFirst().orElseThrow().getRegistrationId();
        registrationManagementService.approve(
                reviewed.getId(), firstId, "publisher_test_001", "同意报名");

        assertThatThrownBy(() -> registrationManagementService.approve(
                reviewed.getId(), secondId, "publisher_test_001", "同意报名"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("名额已满");

        var finalView = registrationManagementService.getRegistrations(
                reviewed.getId(), "publisher_test_001");
        assertThat(finalView.getApprovedCount()).isEqualTo(1);
        assertThat(finalView.getPendingCount()).isEqualTo(1);
        assertThat(finalView.getRemainingCapacity()).isZero();

        Activity firstCome = publish(completeResult(false, 2));
        studentActivityService.register(firstCome.getId(), "student_001");
        Long directId = registrationRepository.findByActivityIdAndStudentId(
                firstCome.getId(), "student_001").orElseThrow().getId();
        assertThatThrownBy(() -> registrationManagementService.approve(
                firstCome.getId(), directId, "publisher_test_001", null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("先到先得");
    }

    @Test
    void shouldRejectOfflineRegistrationAndCancellationAfterStart() {
        Activity offline = publish(completeResult(false, 20));
        offline.setOfflineTime(LocalDateTime.now().minusMinutes(1));
        activityRepository.saveAndFlush(offline);

        assertThatThrownBy(() -> studentActivityService.register(offline.getId(), "student_001"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("已下架");

        Activity started = publish(completeResult(false, 20));
        studentActivityService.register(started.getId(), "student_001");
        started.setStartTime(LocalDateTime.now().minusMinutes(1));
        activityRepository.saveAndFlush(started);

        assertThatThrownBy(() -> studentActivityService.cancel(started.getId(), "student_001"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("已经开始");
    }

    @Test
    void shouldSupportSelfCheckInManualCorrectionAndCsvExport() {
        Activity published = publish(completeResult(false, 20));
        studentActivityService.register(published.getId(), "student_001");

        var opened = checkInManagementService.openCheckIn(published.getId(), "publisher_test_001");
        assertThat(opened.isCheckInOpen()).isTrue();
        assertThat(opened.getCheckInCode()).matches("\\d{6}");
        assertThat(opened.getApprovedCount()).isEqualTo(1);

        String wrongCode = "000000".equals(opened.getCheckInCode()) ? "000001" : "000000";
        assertThatThrownBy(() -> studentActivityService.checkIn(published.getId(), "student_001", wrongCode))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("签到码不正确");

        StudentActivityView checkedIn = studentActivityService.checkIn(
                published.getId(), "student_001", opened.getCheckInCode());
        assertThat(checkedIn.isCheckedIn()).isTrue();
        assertThat(checkedIn.getCheckedInAt()).isNotNull();

        var roster = checkInManagementService.getRoster(published.getId(), "publisher_test_001");
        assertThat(roster.getCheckedInCount()).isEqualTo(1);
        assertThat(roster.getAbsentCount()).isZero();
        assertThat(roster.getRegistrations()).singleElement()
                .satisfies(item -> assertThat(item.getStudentName()).isEqualTo("学生用户"));

        assertThatThrownBy(() -> studentActivityService.cancel(published.getId(), "student_001"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("已经完成签到");

        byte[] csv = checkInManagementService.exportCsv(published.getId(), "publisher_test_001");
        String csvText = new String(csv, StandardCharsets.UTF_8);
        assertThat(csvText).startsWith("\uFEFF序号,学号/工号");
        assertThat(csvText).contains("学生用户", "已签到", "学生现场签到");

        Long registrationId = roster.getRegistrations().get(0).getRegistrationId();
        var undone = checkInManagementService.undoCheckIn(
                published.getId(), registrationId, "publisher_test_001");
        assertThat(undone.getCheckedInCount()).isZero();
        var manual = checkInManagementService.manualCheckIn(
                published.getId(), registrationId, "publisher_test_001");
        assertThat(manual.getRegistrations().get(0).getCheckInMethod()).isEqualTo("MANUAL");
    }

    @Test
    void shouldSupportRadarLocationCheckInAndRejectStudentsOutsideRadius() {
        ActivityParsedResult result = completeResult(false, 20);
        result.setCheckInMode("LOCATION");
        Activity published = publish(result);
        studentActivityService.register(published.getId(), "student_001");

        OpenCheckInRequest openRequest = new OpenCheckInRequest();
        openRequest.setLatitude(23.129100d);
        openRequest.setLongitude(113.264400d);
        openRequest.setAccuracyMeters(12d);
        openRequest.setRadiusMeters(100);
        var opened = checkInManagementService.openCheckIn(
                published.getId(), "publisher_test_001", openRequest);

        assertThat(opened.isCheckInOpen()).isTrue();
        assertThat(opened.getCheckInCode()).isNull();
        assertThat(opened.getCheckInRadiusMeters()).isEqualTo(100);

        CheckInRequest outside = new CheckInRequest();
        outside.setLatitude(23.131100d);
        outside.setLongitude(113.264400d);
        outside.setAccuracyMeters(10d);
        assertThatThrownBy(() -> studentActivityService.checkIn(
                published.getId(), "student_001", outside))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("需进入100米范围内");

        CheckInRequest inside = new CheckInRequest();
        inside.setLatitude(23.129280d);
        inside.setLongitude(113.264400d);
        inside.setAccuracyMeters(8d);
        StudentActivityView checkedIn = studentActivityService.checkIn(
                published.getId(), "student_001", inside);

        assertThat(checkedIn.isCheckedIn()).isTrue();
        assertThat(checkedIn.getCheckInDistanceMeters()).isBetween(15, 30);
        assertThat(checkInManagementService.getRoster(published.getId(), "publisher_test_001")
                .getRegistrations()).singleElement().satisfies(item -> {
                    assertThat(item.getCheckInMethod()).isEqualTo("SELF_LOCATION");
                    assertThat(item.getCheckInDistanceMeters()).isBetween(15, 30);
                    assertThat(item.getCheckInAccuracyMeters()).isEqualTo(8d);
                });
    }

    private Activity publish(ActivityParsedResult result) {
        String creator = "publisher_test_001";
        Activity activity = activityService.createActivity(result, creator);
        activityService.submitForApproval(activity.getId(), null, creator, "INFORMATION_ENGINEERING");
        approvalService.approve(activity.getId(), "通过", "reviewer_test_001", "COLLEGE_REVIEWER", "INFORMATION_ENGINEERING");
        approvalService.approve(activity.getId(), "通过", "leader_test_001", "COLLEGE_LEADER", "INFORMATION_ENGINEERING");
        return activityService.publishActivity(activity.getId(), creator);
    }

    private ActivityParsedResult completeResult(boolean approvalRequired, int capacity) {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        ActivityParsedResult result = new ActivityParsedResult();
        result.setTitle("学生创新实践活动");
        result.setCategory("PRACTICE");
        result.setLocation("学生活动中心");
        result.setOrganizer("学院团委");
        result.setContent("面向学生开放的校园创新实践活动。");
        result.setStartTime(now.plusDays(5).format(formatter));
        result.setEndTime(now.plusDays(5).plusHours(2).format(formatter));
        result.setRegStartTime(now.minusDays(1).format(formatter));
        result.setRegEndTime(now.plusDays(4).format(formatter));
        result.setMaxParticipants(capacity);
        result.setRegistrationRequired(true);
        result.setRegistrationApprovalRequired(approvalRequired);
        result.setRecognitionType("NONE");
        result.setCheckInMode("QR");
        return result;
    }
}
