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

    @Autowired
    private ActivityService activityService;

    @Autowired
    private ActivityRepository activityRepository;

    @BeforeEach
    void cleanDatabase() {
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

        Activity submitted = activityService.submitForApproval(created.getId(), "请审批", CREATOR_ID);
        assertThat(submitted.getStatus()).isEqualTo("PENDING_APPROVAL");
        assertThat(submitted.getSubmittedAt()).isNotNull();
        assertThat(activityService.getStatusStats(CREATOR_ID).get("PENDING_APPROVAL")).isEqualTo(1L);
    }

    @Test
    void shouldAllowIncompleteDraftButRejectIncompleteSubmission() {
        ActivityParsedResult draft = new ActivityParsedResult();
        draft.setCreationMode("MANUAL");

        Activity created = activityService.createActivity(draft, CREATOR_ID);
        assertThat(created.getStatus()).isEqualTo("DRAFT");

        assertThatThrownBy(() -> activityService.submitForApproval(created.getId(), null, CREATOR_ID))
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

        assertThatThrownBy(() -> activityService.submitForApproval(created.getId(), null, CREATOR_ID))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("第二课堂学分必须大于 0");
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
