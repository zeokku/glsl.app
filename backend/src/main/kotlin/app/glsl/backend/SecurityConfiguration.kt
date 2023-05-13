package app.glsl.backend

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.config.annotation.web.invoke

@Configuration
class SecurityConfiguration {
    @Bean
    fun securityFilterChain(httpSecurity: HttpSecurity): SecurityFilterChain {
        httpSecurity {
            csrf { disable() }
            authorizeRequests {
                authorize(anyRequest, permitAll)
            }
        }

        return httpSecurity.build()
    }
}
