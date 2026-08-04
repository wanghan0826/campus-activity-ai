package com.xxx.campus.model;

public record ImageSettingsResponse(
        boolean configured,
        String maskedKey,
        String apiUrl,
        String model
) {
}
