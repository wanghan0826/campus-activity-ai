package com.xxx.campus.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@ConfigurationProperties(prefix = "document-import")
public class OfficialDocumentImportProperties {
    private boolean enabled;
    private List<String> allowedHosts = new ArrayList<>();
    private boolean allowHttp;
    private boolean allowPrivateAddresses;
    private int connectTimeoutSeconds = 8;
    private int requestTimeoutSeconds = 15;
    private int maxBytes = 2_000_000;
}
