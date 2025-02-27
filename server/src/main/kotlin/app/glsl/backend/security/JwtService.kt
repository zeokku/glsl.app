package app.glsl.backend.security

import app.glsl.backend.configuration.ApplicationProperties
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.exceptions.JWTVerificationException
import com.auth0.jwt.interfaces.DecodedJWT
import org.springframework.security.core.GrantedAuthority
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.*

@Service
class JwtService(private val applicationProperties: ApplicationProperties) {
    fun createJwtToken(
        subjectName: String,
        authorities: Collection<GrantedAuthority>,
        expirationInSeconds: Long
    ): String =
        JWT.create()
            .withSubject(subjectName)
            .withExpiresAt(Date.from(Instant.now().plusSeconds(expirationInSeconds)))
            .withIssuer(applicationProperties.hostname)
            .withClaim("roles", authorities.map { it.authority })
            .sign(Algorithm.HMAC256(applicationProperties.jwtSecret))

    fun verifyJwtToken(accessToken: String): DecodedJWT? =
        try {
            JWT.require(Algorithm.HMAC256(applicationProperties.jwtSecret))
                .withIssuer(applicationProperties.hostname)
                .build()
                .verify(accessToken)
        } catch (e: JWTVerificationException) {
            null
        }
}
