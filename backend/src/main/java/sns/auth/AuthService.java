package sns.auth;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import sns.user.UserAccount;
import sns.user.UserRepository;
import sns.user.UserResponse;

@Service
public class AuthService {

    static final String LOGIN_FAILED = "ユーザー名またはパスワードが違います。";
    private static final int BCRYPT_MAX_BYTES = 72;
    private static final Pattern USERNAME = Pattern.compile("^[A-Za-z][A-Za-z0-9_]{3,14}$");

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.dummyHash = passwordEncoder.encode("dummy-password");
    }

    public AuthResponse register(RegisterRequest request) {
        if (request == null) {
            throw new ApiException(400, "入力の形が正しくありません。");
        }
        String displayName = validateDisplayName(request.displayName());
        String username = validateUsername(request.username());
        String email = validateEmail(request.email());
        String password = validatePassword(request.password());

        if (users.findByUsernameIgnoreCase(username).isPresent()) {
            throw new ApiException(409, "このユーザー名は使われています。");
        }
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ApiException(409, "このメールアドレスは使われています。");
        }

        UserAccount user = new UserAccount(
                UUID.randomUUID(),
                username,
                displayName,
                email,
                passwordEncoder.encode(password),
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        try {
            users.insert(user);
        } catch (DataIntegrityViolationException exception) {
            throw duplicateFrom(exception);
        }
        return new AuthResponse(jwtService.issue(user.id()), UserResponse.from(user));
    }

    public AuthResponse login(LoginRequest request) {
        String loginId = request == null || request.loginId() == null ? "" : request.loginId().trim();
        String password = request == null || request.password() == null ? "" : request.password();
        if (loginId.isEmpty() || password.isEmpty()) {
            passwordEncoder.matches(password, dummyHash);
            throw new ApiException(401, LOGIN_FAILED);
        }

        Optional<UserAccount> found = loginId.contains("@")
                ? users.findByEmailIgnoreCase(loginId)
                : users.findByUsernameIgnoreCase(loginId);
        UserAccount user = found.orElse(null);
        String hash = user == null ? dummyHash : user.passwordHash();
        boolean matches = passwordEncoder.matches(password, hash);
        if (user == null || !matches) {
            throw new ApiException(401, LOGIN_FAILED);
        }
        return new AuthResponse(jwtService.issue(user.id()), UserResponse.from(user));
    }

    public UserResponse currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UUID userId)) {
            throw new ApiException(401, "ログインが必要です。");
        }
        return users.findById(userId)
                .map(UserResponse::from)
                .orElseThrow(() -> new ApiException(401, "ログインが必要です。"));
    }

    private static String validateDisplayName(String value) {
        String displayName = value == null ? "" : value.trim();
        if (displayName.isEmpty()) {
            throw new ApiException(400, "表示名を入力してください。");
        }
        if (displayName.codePointCount(0, displayName.length()) > 50) {
            throw new ApiException(400, "表示名は1〜50文字にしてください。");
        }
        return displayName;
    }

    private static String validateUsername(String value) {
        String username = value == null ? "" : value;
        if (username.isBlank()) {
            throw new ApiException(400, "ユーザー名を入力してください。");
        }
        if (!USERNAME.matcher(username).matches()) {
            throw new ApiException(400, "ユーザー名は4〜15文字で、半角英字から始め、続きは半角英数字または _ です。");
        }
        return username;
    }

    private static String validateEmail(String value) {
        String email = value == null ? "" : value.trim();
        if (email.isEmpty()) {
            throw new ApiException(400, "メールアドレスを入力してください。");
        }
        if (email.length() > 255 || !isEmailShape(email)) {
            throw new ApiException(400, "メールアドレスの形が正しくありません。");
        }
        return email;
    }

    private static boolean isEmailShape(String email) {
        int at = email.indexOf('@');
        return at > 0
                && at == email.lastIndexOf('@')
                && at < email.length() - 1
                && !email.contains(" ");
    }

    private static String validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new ApiException(400, "パスワードは8文字以上にしてください。");
        }
        if (password.codePointCount(0, password.length()) > 128) {
            throw new ApiException(400, "パスワードは128文字以下にしてください。");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES) {
            throw new ApiException(400, "パスワードが長すぎます。");
        }
        return password;
    }

    private static ApiException duplicateFrom(DataIntegrityViolationException exception) {
        String detail = exception.getMostSpecificCause().getMessage();
        if (detail != null && detail.contains("users_username_lower_idx")) {
            return new ApiException(409, "このユーザー名は使われています。");
        }
        if (detail != null && detail.contains("users_email_lower_idx")) {
            return new ApiException(409, "このメールアドレスは使われています。");
        }
        return new ApiException(409, "このユーザー名またはメールアドレスは使われています。");
    }
}
