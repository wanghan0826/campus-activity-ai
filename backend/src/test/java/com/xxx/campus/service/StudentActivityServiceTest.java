package com.xxx.campus.service;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ActivityParsedResult;
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
        assertThat(registered.getRegisteredCount()).isEqualTo(1);
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
    void shouldEnforceCapacityAndDirectlyApproveRegistration() {
        Activity published = publish(completeResult(false, 1));

        StudentActivityView first = studentActivityService.register(published.getId(), "student_001");
        assertThat(first.getRegistrationStatus()).isEqualTo("APPROVED");

        assertThatThrownBy(() -> studentActivityService.register(published.getId(), "student_002"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("名额已满");
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
