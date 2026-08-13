package com.xxx.campus.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class NotificationGroupRequest {

    @NotBlank(message = "请填写群聊名称")
    @Size(max = 100, message = "群聊名称不能超过100个字符")
    private String name;

    @NotBlank(message = "请填写群机器人 Webhook 地址")
    @Size(max = 500, message = "Webhook 地址过长")
    private String webhookUrl;
}
