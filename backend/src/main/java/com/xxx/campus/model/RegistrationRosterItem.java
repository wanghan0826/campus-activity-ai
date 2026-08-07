package com.xxx.campus.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RegistrationRosterItem {
    private Long registrationId;
    private String studentId;
    private String studentName;
    private String collegeCode;
    private String collegeName;
    private String registrationStatus;
    private LocalDateTime registeredAt;
    private boolean checkedIn;
    private LocalDateTime checkedInAt;
    private String checkInMethod;
    private String checkedInBy;
    private LocalDateTime reviewedAt;
    private String reviewedBy;
    private String reviewComment;
}
