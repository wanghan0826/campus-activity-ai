package com.xxx.campus.service;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ActivityParsedResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class ActivityServiceTest {

    private static final String CREATOR_ID = "teacher_test_001";
    private static final String COLLEGE = "INFORMATION_ENGINEERING";
    private static final String REVIEWER_ID = "reviewer_test_001";
    private static final String LEADER_ID = "leader_test_001";

    @Autowired
    private ActivityService activityService;

    @Autowired
    private ApprovalService approvalService;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private ApprovalRecordRepository approvalRecordRepository;

    @BeforeEach
    void cleanDatabase() {
        approvalRecordRepository.deleteAll();
        activityRepository.deleteAll();
    }

    @Test
    void shouldCreateDraftAndSubmitForApproval() {
        ActivityParsedResult draft = completeResult();

        Activity created = activityService.createActivity(draft, CREATOR_ID);
        assertThat(created.getId()).isNotNull();
        assertThat(created.getStatus()).isEqualTo("DRAFT");
        assertThat(created.getSchedule()).hasSize(1);
        assertThat(created.getMaterials()).containsExactly("签到表", "奖品");
        assertThat(created.getRecognitionType()).isEqualTo("CREDIT");
        assertThat(created.getSecondClassCredits()).isEqualByComparingTo("0.5");

        Activity submitted = activityService.submitForApproval(created.getId(), "请审批", CREATOR_ID, COLLEGE);
        assertThat(submitted.getStatus()).isEqualTo("PENDING_APPROVAL");
        assertThat(submitted.getApprovalStage()).isEqualTo("COLLEGE_REVIEWER");
        assertThat(submitted.getApprovalRound()).isEqualTo(1);
        assertThat(submitted.getReviewDept()).isEqualTo(COLLEGE);
        assertThat(submitted.getSubmittedAt()).isNotNull();
        assertThat(activityService.getStatusStats(CREATOR_ID).get("PENDING_APPROVAL")).isEqualTo(1L);
        assertThat(approvalService.listPendingTasks("COLLEGE_REVIEWER", COLLEGE, null, 0, 20).getTotalElements())
                .isEqualTo(1);
        assertThat(approvalService.listPendingTasks("COLLEGE_LEADER", COLLEGE, null, 0, 20).getTotalElements())
                .isZero();

        Activity teacherApproved = approvalService.approve(
                created.getId(), "材料完整", REVIEWER_ID, "COLLEGE_REVIEWER", COLLEGE);
        assertThat(teacherApproved.getStatus()).isEqualTo("PENDING_APPROVAL");
        assertThat(teacherApproved.getApprovalStage()).isEqualTo("COLLEGE_LEADER");
        assertThat(teacherApproved.getReviewTeacher()).isEqualTo(REVIEWER_ID);
        assertThat(approvalService.listPendingTasks("COLLEGE_REVIEWER", COLLEGE, null, 0, 20).getTotalElements())
                .isZero();
        assertThat(approvalService.listPendingTasks("COLLEGE_LEADER", COLLEGE, null, 0, 20).getTotalElements())
                .isEqualTo(1);

        Activity leaderApproved = approvalService.approve(
                created.getId(), "同意举办", LEADER_ID, "COLLEGE_LEADER", COLLEGE);
        assertThat(leaderApproved.getStatus()).isEqualTo("APPROVED");
        assertThat(leaderApproved.getApprovalStage()).isEqualTo("COMPLETED");
        assertThat(leaderApproved.getApprovedAt()).isNotNull();

        Activity published = activityService.publishActivity(created.getId(), CREATOR_ID);
        assertThat(published.getStatus()).isEqualTo("PUBLISHED");
        assertThat(published.getPublishTime()).isNotNull();
        assertThat(approvalRecordRepository.findByActivityIdOrderByCreatedAtAscIdAsc(created.getId()))
                .extracting("action")
                .containsExactly("SUBMITTED", "APPROVED", "APPROVED");
    }

    @Test
    void shouldAllowIncompleteDraftButRejectIncompleteSubmission() {
        ActivityParsedResult draft = new ActivityParsedResult();
        draft.setCreationMode("MANUAL");

        Activity created = activityService.createActivity(draft, CREATOR_ID);
        assertThat(created.getStatus()).isEqualTo("DRAFT");

        assertThatThrownBy(() -> activityService.submitForApproval(created.getId(), null, CREATOR_ID, COLLEGE))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("请补齐后再提交");
    }

    @Test
    void shouldListDuplicateAndDeleteOwnedDrafts() {
        Activity created = activityService.createActivity(completeResult(), CREATOR_ID);
        Activity copy = activityService.duplicateActivity(created.getId(), CREATOR_ID);

        assertThat(copy.getTitle()).endsWith("（副本）");
        assertThat(copy.getRecognitionType()).isEqualTo("CREDIT");
        assertThat(copy.getSecondClassCredits()).isEqualByComparingTo("0.5");
        assertThat(activityService.listActivities(CREATOR_ID, "DRAFT", "趣味", 0, 20).getTotalElements()).isEqualTo(2);

        activityService.deleteDraft(copy.getId(), CREATOR_ID);
        assertThat(activityService.getStatusStats(CREATOR_ID).get("ALL")).isEqualTo(1L);
    }

    @Test
    void shouldRejectCreditRecognitionWithoutPositiveCredits() {
        ActivityParsedResult result = completeResult();
        result.setSecondClassCredits(BigDecimal.ZERO);
        Activity created = activityService.createActivity(result, CREATOR_ID);

        assertThatThrownBy(() -> activityService.submitForApproval(created.getId(), null, CREATOR_ID, COLLEGE))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("第二课堂学分必须大于 0");
    }

    @Test
    void shouldRejectAndAllowPublisherToReviseAndResubmit() {
        Activity created = activityService.createActivity(completeResult(), CREATOR_ID);
        activityService.submitForApproval(created.getId(), null, CREATOR_ID, COLLEGE);

        Activity rejected = approvalService.reject(
                created.getId(), "请补充安全预案", REVIEWER_ID, "COLLEGE_REVIEWER", COLLEGE);
        assertThat(rejected.getStatus()).isEqualTo("REJECTED");
        assertThat(rejected.getApprovalStage()).isEqualTo("REJECTED");

        ActivityParsedResult revised = completeResult();
        revised.setContent("面向全院本科生开展的校园趣味竞赛活动，已补充安全预案。");
        activityService.updateActivity(created.getId(), revised, CREATOR_ID);
        Activity resubmitted = activityService.submitForApproval(created.getId(), "已补充", CREATOR_ID, COLLEGE);

        assertThat(resubmitted.getApprovalRound()).isEqualTo(2);
        assertThat(resubmitted.getApprovalStage()).isEqualTo("COLLEGE_REVIEWER");
        assertThat(resubmitted.getReviewTeacher()).isNull();
        assertThat(approvalRecordRepository.findByActivityIdOrderByCreatedAtAscIdAsc(created.getId()))
                .extracting("action")
                .containsExactly("SUBMITTED", "REJECTED", "SUBMITTED");
    }

    @Test
    void shouldEnforceRoleStageAndCollegeBoundaries() {
        Activity created = activityService.createActivity(completeResult(), CREATOR_ID);
        activityService.submitForApproval(created.getId(), null, CREATOR_ID, COLLEGE);

        assertThatThrownBy(() -> approvalService.approve(
                created.getId(), null, LEADER_ID, "COLLEGE_LEADER", COLLEGE))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("尚未流转到当前审批节点");

        assertThatThrownBy(() -> approvalService.approve(
                created.getId(), null, REVIEWER_ID, "COLLEGE_REVIEWER", "艺术学院"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("只能审批本学院");

        assertThatThrownBy(() -> approvalService.reject(
                created.getId(), "", REVIEWER_ID, "COLLEGE_REVIEWER", COLLEGE))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("必须填写原因");
    }

    private ActivityParsedResult completeResult() {
        ActivityParsedResult result = new ActivityParsedResult();
        result.setTitle("校园趣味竞赛");
        result.setCategory("SPORTS");
        result.setLocation("多功能厅");
        result.setOrganizer("学院团委");
        result.setTargetAudience("全院本科生");
        result.setContent("面向全院本科生开展的校园趣味竞赛活动。");
        result.setStartTime("2026-08-08T14:00:00");
        result.setEndTime("2026-08-08T16:00:00");
        result.setRegStartTime("2026-08-01T08:00:00");
        result.setRegEndTime("2026-08-07T18:00:00");
        result.setMaxParticipants(120);
        result.setBudget(new BigDecimal("3000"));
        result.setRegistrationRequired(true);
        result.setRegistrationApprovalRequired(true);
        result.setRecognitionType("CREDIT");
        result.setSecondClassCredits(new BigDecimal("0.5"));
        result.setCheckInMode("QR");
        result.setParticipationRequirements("完成签到并全程参与活动后予以认定");
        result.setMaterials(List.of("签到表", "奖品"));
        ActivityParsedResult.ScheduleItem item = new ActivityParsedResult.ScheduleItem();
        item.setTime("14:00-14:20");
        item.setContent("开场与规则介绍");
        result.setSchedule(List.of(item));
        return result;
    }
}
