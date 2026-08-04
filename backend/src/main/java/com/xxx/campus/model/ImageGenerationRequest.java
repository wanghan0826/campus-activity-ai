package com.xxx.campus.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ImageGenerationRequest {

    @NotBlank(message = "请先填写封面描述")
    @Size(max = 2000, message = "封面描述不能超过 2000 个字符")
    private String prompt;
}
