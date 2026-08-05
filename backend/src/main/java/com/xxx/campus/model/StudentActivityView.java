package com.xxx.campus.model;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** 学生端活动视图，隐藏预算、原始文档和内部审批字段。 */
@Data
@Builder
public class StudentActivityView {
    private Long id;
    private String title;
    private String category;
    private String campus;
    private String location;
    private String organizer;
    private String coverImage;
    private String content;
    private String targetAudience;
    private String contactInfo;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime regStartTime;
    private LocalDateTime regEndTime;
    private Integer maxParticipants;
    private Boolean registrationRequired;
    private Boolean registrationApprovalRequired;
    private String recognitionType;
    private BigDecimal secondClassCredits;
    private BigDecimal volunteerHours;
    private String checkInMode;
    private String participationRequirements;
    private List<ActivityScheduleItem> schedule;
    private List<String> materials;
    private long registeredCount;
    private String registrationStatus;
    private LocalDateTime registeredAt;
    private boolean canRegister;
    private String registrationNotice;
}
