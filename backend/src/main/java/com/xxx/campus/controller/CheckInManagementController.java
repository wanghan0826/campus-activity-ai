package com.xxx.campus.controller;

import com.xxx.campus.model.CheckInRosterView;
import com.xxx.campus.security.AuthenticatedUser;
import com.xxx.campus.service.CheckInManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/activities/{activityId}/check-in")
@RequiredArgsConstructor
public class CheckInManagementController {

    private final CheckInManagementService checkInManagementService;

    @GetMapping
    public ResponseEntity<CheckInRosterView> getRoster(
            @PathVariable Long activityId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(checkInManagementService.getRoster(activityId, user.userId()));
    }

    @PostMapping("/open")
    public ResponseEntity<CheckInRosterView> open(
            @PathVariable Long activityId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(checkInManagementService.openCheckIn(activityId, user.userId()));
    }

    @PostMapping("/close")
    public ResponseEntity<CheckInRosterView> close(
            @PathVariable Long activityId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(checkInManagementService.closeCheckIn(activityId, user.userId()));
    }

    @PostMapping("/registrations/{registrationId}")
    public ResponseEntity<CheckInRosterView> manualCheckIn(
            @PathVariable Long activityId,
            @PathVariable Long registrationId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(checkInManagementService.manualCheckIn(
                activityId, registrationId, user.userId()));
    }

    @DeleteMapping("/registrations/{registrationId}")
    public ResponseEntity<CheckInRosterView> undoCheckIn(
            @PathVariable Long activityId,
            @PathVariable Long registrationId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(checkInManagementService.undoCheckIn(
                activityId, registrationId, user.userId()));
    }

    @GetMapping(value = "/export", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> export(
            @PathVariable Long activityId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        byte[] csv = checkInManagementService.exportCsv(activityId, user.userId());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=activity-" + activityId + "-attendance.csv")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .body(csv);
    }
}
