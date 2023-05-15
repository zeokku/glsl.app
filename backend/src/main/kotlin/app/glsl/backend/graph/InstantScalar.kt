package app.glsl.backend.graph

import com.netflix.graphql.dgs.DgsScalar
import graphql.language.StringValue
import graphql.schema.Coercing
import graphql.schema.CoercingParseLiteralException
import graphql.schema.CoercingSerializeException
import java.time.Instant

@DgsScalar(name = "Instant")
class InstantScalar : Coercing<Instant, String> {
    override fun serialize(dataFetcherResult: Any): String =
        if (dataFetcherResult is Instant) dataFetcherResult.toString()
        else throw CoercingSerializeException("Not a valid Instant")

    override fun parseValue(input: Any): Instant = Instant.parse(input.toString())

    override fun parseLiteral(input: Any): Instant =
        if (input is StringValue) Instant.parse(input.value)
        else throw CoercingParseLiteralException("Value is not a valid ISO date time")
}
