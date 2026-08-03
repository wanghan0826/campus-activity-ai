package com.xxx.campus.model;

public record AiSettingsResponse(
        boolean configured,
        String maskedKey,
        String provider,
        String model
) {
}
