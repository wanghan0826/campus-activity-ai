package com.xxx.campus.service;

import com.xxx.campus.config.OfficialDocumentImportProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OfficialDocumentImportServiceTest {

    private OfficialDocumentImportProperties properties;
    private OfficialDocumentImportService service;

    @BeforeEach
    void setUp() {
        properties = new OfficialDocumentImportProperties();
        properties.setEnabled(true);
        properties.setAllowedHosts(List.of("gongwen.example.edu"));
        properties.setAllowPrivateAddresses(true);
        service = new OfficialDocumentImportService(properties);
    }

    @Test
    void shouldExtractReadableTextAndDiscardUnsafePageElements() {
        var extracted = service.extractText("""
                <html><head><title>关于举办校园创新周的通知</title><style>.hide{}</style></head>
                <body><h1>校园创新周</h1><p>活动时间：2026年8月20日星期四</p>
                <script>alert('x')</script><p>地点：大学生活动中心</p></body></html>
                """, true, "https://gongwen.example.edu/notice/1");

        assertThat(extracted.title()).isEqualTo("关于举办校园创新周的通知");
        assertThat(extracted.text()).contains("校园创新周", "2026年8月20日星期四", "大学生活动中心");
        assertThat(extracted.text()).doesNotContain("alert", ".hide");
    }

    @Test
    void shouldOnlyAcceptConfiguredHttpsHosts() {
        assertThat(service.parseAndValidate("https://gongwen.example.edu/notice/1").getHost())
                .isEqualTo("gongwen.example.edu");
        assertThat(service.parseAndValidate("https://sub.gongwen.example.edu/notice/1").getHost())
                .isEqualTo("sub.gongwen.example.edu");

        assertThatThrownBy(() -> service.parseAndValidate("https://example.com/notice/1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("不属于已配置");
        assertThatThrownBy(() -> service.parseAndValidate("http://gongwen.example.edu/notice/1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("HTTPS");
    }
}
