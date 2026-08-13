package com.xxx.campus.service;

import com.xxx.campus.model.NotificationGroup;
import com.xxx.campus.model.NotificationGroupRequest;
import com.xxx.campus.model.NotificationGroupView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationGroupService {

    private final NotificationGroupRepository repository;

    @Transactional(readOnly = true)
    public List<NotificationGroupView> list() {
        return repository.findAllByOrderByEnabledDescNameAsc().stream()
                .map(NotificationGroupView::from)
                .toList();
    }

    @Transactional
    public NotificationGroupView create(NotificationGroupRequest request, String creatorId) {
        String name = request.getName().trim();
        repository.findByNameIgnoreCase(name).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "该群聊名称已存在");
        });
        String webhookUrl = validateWebhook(request.getWebhookUrl());
        NotificationGroup saved = repository.save(NotificationGroup.builder()
                .name(name)
                .webhookUrl(webhookUrl)
                .enabled(true)
                .createdBy(creatorId)
                .build());
        return NotificationGroupView.from(saved);
    }

    @Transactional
    public NotificationGroupView update(Long id, NotificationGroupRequest request) {
        NotificationGroup group = get(id);
        String name = request.getName().trim();
        repository.findByNameIgnoreCase(name)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "该群聊名称已存在");
                });
        group.setName(name);
        group.setWebhookUrl(validateWebhook(request.getWebhookUrl()));
        group.setEnabled(true);
        return NotificationGroupView.from(repository.save(group));
    }

    @Transactional
    public void disable(Long id) {
        NotificationGroup group = get(id);
        group.setEnabled(false);
        repository.save(group);
    }

    private NotificationGroup get(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "通知群聊不存在"));
    }

    private String validateWebhook(String rawValue) {
        try {
            URI uri = URI.create(rawValue.trim());
            boolean valid = "https".equalsIgnoreCase(uri.getScheme())
                    && "qyapi.weixin.qq.com".equalsIgnoreCase(uri.getHost())
                    && "/cgi-bin/webhook/send".equals(uri.getPath())
                    && uri.getQuery() != null
                    && uri.getQuery().matches("(^|.*&)key=[A-Za-z0-9-]{20,}(&.*|$)");
            if (!valid) throw new IllegalArgumentException();
            return uri.toString();
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请输入从企微信群机器人复制的完整 Webhook 地址");
        }
    }
}
