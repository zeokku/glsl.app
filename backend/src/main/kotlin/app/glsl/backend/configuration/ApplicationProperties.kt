package app.glsl.backend.configuration

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("application")
data class ApplicationProperties(
    val hostname: String,
    val jwtSecret: String,
    val successfulAuthRedirectUrl: String,
    val loginPageUrl: String
)
