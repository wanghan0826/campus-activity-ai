package com.xxx.campus.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class RegistrationManagementView {
    private Long activityId;
    private String activityTitle;
    private String location;
    private LocalDateTime startTime;
    private boolean approvalRequired;
    private Integer maxParticipants;
    private Long remainingCapacity;
    private long applicationCount;
    private long approvedCount;
    private long pendingCount;
    private long rejectedCount;
    private long cancelledCount;
    private List<RegistrationRosterItem> registrations;
}
