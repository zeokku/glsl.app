package app.glsl.backend

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsQuery

@DgsComponent
class HelloWorldDataFetcher {
    @DgsQuery
    fun hello() = "world"
}
