package com.xxx.campus.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiSettingsRequest {

    @NotBlank(message = "API Key 不能为空")
    @Size(max = 500, message = "API Key 长度不合法")
    private String apiKey;
}
