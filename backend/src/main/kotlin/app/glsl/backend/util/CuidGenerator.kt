package app.glsl.backend.util

import io.github.thibaultmeyer.cuid.CUID
import org.hibernate.engine.spi.SharedSessionContractImplementor
import org.hibernate.id.IdentifierGenerator

/** Used via reflection in [app.glsl.backend.domain.Author] */
@Suppress("unused")
class CuidGenerator : IdentifierGenerator {
    override fun generate(session: SharedSessionContractImplementor?, `object`: Any?): Any {
        return CUID.randomCUID2().toString()
    }
}
