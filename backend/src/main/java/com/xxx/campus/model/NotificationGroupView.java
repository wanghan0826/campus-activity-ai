package com.xxx.campus.model;

public record NotificationGroupView(Long id, String name, boolean enabled, boolean configured) {
    public static NotificationGroupView from(NotificationGroup group) {
        return new NotificationGroupView(
                group.getId(),
                group.getName(),
                Boolean.TRUE.equals(group.getEnabled()),
                group.getWebhookUrl() != null && !group.getWebhookUrl().isBlank()
        );
    }
}
