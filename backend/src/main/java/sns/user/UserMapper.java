package sns.user;

import java.util.UUID;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {

    UserAccount findById(UUID id);

    UserAccount findByUsernameIgnoreCase(String username);

    UserAccount findByEmailIgnoreCase(String email);

    int insert(UserAccount user);
}
