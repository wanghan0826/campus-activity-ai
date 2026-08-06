package com.xxx.campus.service;

import com.xxx.campus.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.Collection;
import java.util.List;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByUsernameIgnoreCase(String username);

    Optional<UserAccount> findByUserId(String userId);

    List<UserAccount> findByUserIdIn(Collection<String> userIds);
}
