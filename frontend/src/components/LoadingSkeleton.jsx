export default function LoadingSkeleton({ rows = 4 }) {
    return (
        <div className="animate-pulse space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg" />
            ))}
        </div>
    )
}

export function CardSkeleton({ count = 4 }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                    <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
                    <div className="h-8 bg-gray-100 rounded w-3/4" />
                </div>
            ))}
        </div>
    )
}
