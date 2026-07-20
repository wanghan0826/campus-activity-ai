package com.xxx.campus.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 前端请求：教师粘贴原始文档
 */
@Data
public class ActivityRequest {

    @NotBlank(message = "活动文档不能为空")
    private String document;

    /** 可选：如果教师手动修改了 AI 的解析结果，用这个字段传回来确认创建 */
    private ActivityParsedResult editedResult;
}
