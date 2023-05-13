package app.glsl.backend

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsQuery
import org.springframework.security.access.annotation.Secured

@DgsComponent
class HelloWorldDataFetcher {
    @DgsQuery
    fun hello() = "world"

    @Secured("AUTHOR")
    @DgsQuery
    fun secret() = "pretty sneaky"
}
