package com.xxx.campus.security;

import com.xxx.campus.model.AuthUserView;
import com.xxx.campus.model.UserAccount;

/** 由登录过滤器写入 SecurityContext，控制器只能从这里读取可信身份。 */
public record AuthenticatedUser(
        Long accountId,
        String userId,
        String username,
        String displayName,
        String role,
        String collegeCode,
        String collegeName,
        String authSource,
        Long sessionId
) {
    public static AuthenticatedUser from(UserAccount user, Long sessionId) {
        return new AuthenticatedUser(
                user.getId(),
                user.getUserId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getRole(),
                user.getCollegeCode(),
                user.getCollegeName(),
                user.getAuthSource(),
                sessionId
        );
    }

    public AuthUserView toView() {
        return AuthUserView.builder()
                .id(userId)
                .username(username)
                .displayName(displayName)
                .role(role)
                .collegeCode(collegeCode)
                .collegeName(collegeName)
                .authSource(authSource)
                .build();
    }
}
