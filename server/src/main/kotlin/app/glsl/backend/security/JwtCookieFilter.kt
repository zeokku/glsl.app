package app.glsl.backend.security

import app.glsl.backend.service.AuthorService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.OncePerRequestFilter

class JwtCookieFilter(private val jwtService: JwtService, private val authorService: AuthorService) :
    OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val accessToken =
            request.cookies
                ?.find { it.name == "access_token" }
                ?.value ?: return filterChain.doFilter(request, response)

        val verifiedToken =
            jwtService.verifyJwtToken(accessToken) ?: return filterChain.doFilter(request, response)

        SecurityContextHolder.getContext().authentication = JwtAuthenticationToken(
            verifiedToken,
            authorService.findAuthorById(verifiedToken.subject) ?: return filterChain.doFilter(request, response)
        )

        filterChain.doFilter(request, response)
    }
}
