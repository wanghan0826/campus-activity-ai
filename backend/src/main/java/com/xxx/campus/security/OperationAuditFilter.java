package com.xxx.campus.security;

import com.xxx.campus.service.OperationAuditService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class OperationAuditFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(OperationAuditFilter.class);
    private static final Set<String> READ_METHODS = Set.of("GET", "HEAD", "OPTIONS");

    private final OperationAuditService operationAuditService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        AuthenticatedUser user = authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser value
                ? value : null;
        try {
            filterChain.doFilter(request, response);
        } finally {
            if (user != null && !READ_METHODS.contains(request.getMethod())
                    && request.getRequestURI().startsWith("/api/")) {
                try {
                    operationAuditService.record(user, request.getMethod(), request.getRequestURI(), response.getStatus());
                } catch (Exception exception) {
                    log.warn("操作审计记录失败: {}", exception.getMessage());
                }
            }
        }
    }
}
