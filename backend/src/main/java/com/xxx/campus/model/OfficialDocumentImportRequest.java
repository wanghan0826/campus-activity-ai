package com.xxx.campus.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OfficialDocumentImportRequest {
    @NotBlank(message = "请输入公文链接")
    @Size(max = 2048, message = "公文链接过长")
    private String url;
}
