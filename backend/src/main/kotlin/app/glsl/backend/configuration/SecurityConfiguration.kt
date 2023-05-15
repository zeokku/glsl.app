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

@Configuration
@EnableMethodSecurity(securedEnabled = true)
class SecurityConfiguration(
    private val authorService: AuthorService,
    private val jwtService: JwtService,
    private val applicationProperties: ApplicationProperties
) {
    @Bean
    fun securityFilterChain(httpSecurity: HttpSecurity): SecurityFilterChain {
        httpSecurity {
            csrf { disable() }
            authorizeRequests {
                authorize("/", permitAll)
                authorize("/index.html", permitAll)
                authorize("/graphql", permitAll)
                authorize("/graphiql", permitAll)
                authorize(anyRequest, authenticated)
            }
            oauth2Login {
                loginPage = applicationProperties.loginPageUrl
                authenticationSuccessHandler = authenticationSuccessHandler()
            }
            addFilterBefore<OAuth2LoginAuthenticationFilter>(JwtCookieFilter(jwtService, authorService))
        }

        return httpSecurity.build()
    }

    private fun authenticationSuccessHandler() =
        AuthenticationSuccessHandler { _, response, authentication ->
            val principal = authentication.principal

            if (
                principal !is OAuth2AuthenticatedPrincipal
                || "id" !in principal.attributes
                || "name" !in principal.attributes
            ) return@AuthenticationSuccessHandler

            val author = authorService.findOrCreateAuthor(
                principal.attributes["id"] as Int,
                principal.attributes["name"] as String
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
}
