package app.glsl.backend.security

import com.auth0.jwt.interfaces.DecodedJWT
import org.springframework.security.core.Authentication
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority

class JwtAuthenticationToken(private val credentials: DecodedJWT) : Authentication {
    private val subject = credentials.subject

    private val authorities: MutableCollection<out GrantedAuthority> =
        credentials
            .claims["roles"]
            ?.asList(String::class.java)
            ?.map { SimpleGrantedAuthority(it) }
            ?.toMutableList()
            ?: mutableListOf()

    private var authenticated = true

    override fun getName(): String = subject

    override fun getAuthorities(): MutableCollection<out GrantedAuthority> = authorities

    override fun getCredentials(): DecodedJWT = credentials

    override fun getDetails(): Nothing? = null

    override fun getPrincipal(): Any = subject

    override fun isAuthenticated(): Boolean = authenticated

    override fun setAuthenticated(isAuthenticated: Boolean) {
        authenticated = isAuthenticated
    }
}
