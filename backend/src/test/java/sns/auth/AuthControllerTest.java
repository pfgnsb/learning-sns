package sns.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthControllerTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void registerReturnsTokenAndStoresPasswordHash() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": " Ada Lovelace ",
                                  "username": "AdaLovelace",
                                  "email": "Ada@Example.com",
                                  "password": "password1"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value("AdaLovelace"))
                .andExpect(jsonPath("$.user.displayName").value("Ada Lovelace"))
                .andExpect(jsonPath("$.user.email").value("Ada@Example.com"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andReturn();

        String hash = jdbc.sql("SELECT password_hash FROM users WHERE username = :username")
                .param("username", "AdaLovelace")
                .query(String.class)
                .single();
        assertThat(hash).doesNotContain("password1");
        assertThat(passwordEncoder.matches("password1", hash)).isTrue();
        assertThat(result.getResponse().getContentAsString()).doesNotContain(hash);
    }

    @Test
    void rejectsUsernameThatDiffersOnlyByCase() throws Exception {
        register("Grace", "grace", "grace@example.com", "password1");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": "Grace Two",
                                  "username": "Grace",
                                  "email": "grace2@example.com",
                                  "password": "password1"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("このユーザー名は使われています。"));
    }

    @Test
    void logsInWithUsernameOrEmail() throws Exception {
        register("Lin", "linus", "linus@example.com", "password1");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"loginId":"LINUS","password":"password1"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value("linus"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"loginId":"Linus@Example.com","password":"password1"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("linus@example.com"));
    }

    @Test
    void wrongPasswordAndUnknownUserUseTheSameMessage() throws Exception {
        register("Ken", "kent", "kent@example.com", "password1");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"loginId":"kent","password":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(AuthService.LOGIN_FAILED));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"loginId":"nobody","password":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(AuthService.LOGIN_FAILED));
    }

    @Test
    void meRequiresTokenAndReturnsTheSignedInUser() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());

        MvcResult registered = register("Margaret", "margaret", "margaret@example.com", "password1");
        String body = registered.getResponse().getContentAsString();
        String token = body.split("\"token\":\"")[1].split("\"")[0];

        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("margaret"))
                .andExpect(jsonPath("$.displayName").value("Margaret"))
                .andExpect(jsonPath("$.email").value("margaret@example.com"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    private MvcResult register(String displayName, String username, String email, String password) throws Exception {
        String body = """
                {"displayName":"%s","username":"%s","email":"%s","password":"%s"}
                """.formatted(displayName, username, email, password);
        return mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
    }
}
