package app.glsl.backend.configuration

import app.glsl.backend.security.JwtCookieFilter
import app.glsl.backend.security.JwtService
import app.glsl.backend.service.AuthorService
import jakarta.servlet.http.Cookie
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.client.web.OAuth2LoginAuthenticationFilter
import org.springframework.security.oauth2.core.OAuth2AuthenticatedPrincipal
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableMethodSecurity(securedEnabled = true)
class SecurityConfiguration(
    private val authorService: AuthorService,
    private val jwtService: JwtService,
    private val applicationProperties: ApplicationProperties
) {

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration().apply {
            allowedOrigins = applicationProperties.corsOrigins
            allowedMethods = listOf("*")
            allowedHeaders = listOf("*")
            allowCredentials = true
        }

        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/graphql", configuration)
        }
    }

    @Bean
    fun securityFilterChain(httpSecurity: HttpSecurity): SecurityFilterChain {
        httpSecurity {
            cors {}
            csrf { disable() }
            authorizeRequests {
                authorize(anyRequest, permitAll)
            }
            oauth2Login {
                loginPage = applicationProperties.loginPageUrl
                authenticationSuccessHandler = authenticationSuccessHandler()
            }
            logout {
                logoutUrl = "/logout"
                logoutSuccessHandler = logoutSuccessHandler()
            }
            addFilterBefore<OAuth2LoginAuthenticationFilter>(JwtCookieFilter(jwtService, authorService))
        }

        return httpSecurity.build()
    }

    private fun authenticationSuccessHandler() =
        AuthenticationSuccessHandler { _, response, authentication ->
            val principal = authentication.principal

            if (principal !is OAuth2AuthenticatedPrincipal) return@AuthenticationSuccessHandler
            val userData = principal.attributes

            if ("id" !in userData || ("name" !in userData && "login" !in userData)) return@AuthenticationSuccessHandler

            val author = authorService.findOrCreateAuthor(
                userData["id"] as Int,
                userData.getOrElse("name") {
                    userData.getOrElse("login") { return@AuthenticationSuccessHandler }
                } as String
            )

            val authorities =
                if (authentication.authorities.any { it.authority == "OAUTH2_USER" })
                    listOf(SimpleGrantedAuthority("AUTHOR"))
                else emptyList()

            val jwtToken =
                jwtService.createJwtToken(
                    author.id,
                    authorities,
                    604800
                )

            val cookie = Cookie("access_token", jwtToken).apply {
                isHttpOnly = true
                maxAge = 604800
                path = "/"
                domain = applicationProperties.hostname
            }

            response.addCookie(cookie)
            response.sendRedirect(applicationProperties.successfulAuthRedirectUrl)
        }

        private fun logoutSuccessHandler() = LogoutSuccessHandler { _, response, _ ->
            val cookie = Cookie("access_token", null).apply {
                maxAge = 0
            }

            response.addCookie(cookie)
            response.sendRedirect(applicationProperties.successfulLogoutRedirectUrl)
        }
}
