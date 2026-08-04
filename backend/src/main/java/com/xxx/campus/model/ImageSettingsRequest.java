package com.xxx.campus.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ImageSettingsRequest {

    @NotBlank(message = "生图 API Key 不能为空")
    @Size(max = 500, message = "生图 API Key 长度不合法")
    private String apiKey;

    @NotBlank(message = "生图接口地址不能为空")
    @Size(max = 500, message = "生图接口地址过长")
    private String apiUrl;

    @NotBlank(message = "生图模型不能为空")
    @Size(max = 100, message = "生图模型名称过长")
    private String model;
}
