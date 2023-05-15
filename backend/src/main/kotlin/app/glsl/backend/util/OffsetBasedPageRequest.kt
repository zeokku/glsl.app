package app.glsl.backend.util

import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import java.io.Serializable

class OffsetBasedPageRequest(
    private val offset: Int,
    private val limit: Int,
    private val sort: Sort = Sort.unsorted()
) : Pageable, Serializable {

    init {
        require(offset >= 0) { "Offset index must not be less than zero!" }
        require(limit >= 1) { "Limit must not be less than one!" }
    }

    override fun getPageNumber(): Int = offset / limit

    override fun getPageSize(): Int = limit

    override fun getOffset(): Long = offset.toLong()

    override fun getSort(): Sort = sort

    override fun next(): Pageable =
        OffsetBasedPageRequest(getOffset().toInt() + pageSize, pageSize, getSort())

    private fun previous(): OffsetBasedPageRequest =
        if (hasPrevious()) OffsetBasedPageRequest(getOffset().toInt() - pageSize, pageSize, getSort()) else this

    override fun previousOrFirst(): Pageable = if (hasPrevious()) previous() else first()

    override fun first(): Pageable = OffsetBasedPageRequest(0, pageSize, getSort())

    override fun withPage(pageNumber: Int): Pageable = OffsetBasedPageRequest(pageNumber * limit, limit, sort)

    override fun hasPrevious(): Boolean = offset > limit

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as OffsetBasedPageRequest

        if (limit != other.limit) return false
        if (offset != other.offset) return false
        return sort == other.sort
    }

    override fun hashCode(): Int {
        var result = limit
        result = 31 * result + offset
        result = 31 * result + sort.hashCode()
        return result
    }

    override fun toString(): String {
        return "OffsetBasedPageRequest(limit=$limit, offset=$offset, sort=$sort)"
    }

    companion object {
        private const val serialVersionUID = -25822477129613575L
    }
}
