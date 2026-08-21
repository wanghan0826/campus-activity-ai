package com.xxx.campus.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CheckInRosterView {
    private Long activityId;
    private String activityTitle;
    private String location;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String checkInMode;
    private boolean checkInOpen;
    private String checkInCode;
    private LocalDateTime checkInOpenedAt;
    private Double checkInLatitude;
    private Double checkInLongitude;
    private Integer checkInRadiusMeters;
    private Double checkInLocationAccuracyMeters;
    private long totalCount;
    private long approvedCount;
    private long pendingCount;
    private long rejectedCount;
    private long cancelledCount;
    private long checkedInCount;
    private long absentCount;
    private List<RegistrationRosterItem> registrations;
}
