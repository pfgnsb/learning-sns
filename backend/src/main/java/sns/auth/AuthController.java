package sns.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import sns.user.UserResponse;

@RestController
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/api/auth/register")
    public ResponseEntity<AuthResponse> register(@RequestBody(required = false) RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/api/auth/login")
    public AuthResponse login(@RequestBody(required = false) LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/api/me")
    public UserResponse me() {
        return authService.currentUser();
    }
}
