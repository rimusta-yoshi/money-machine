import type { TradeConfig } from '../../types'

interface Props {
  trade: TradeConfig
}

export function GalleryRow({ trade }: Props) {
  return (
    <section className="ff-gal-row">
      <div className="ff-section-head">
        <span className="ff-eyebrow">Our work</span>
        <h2>Recent projects</h2>
      </div>
      <div className="ff-gal-scroll">
        {Array.from({ length: 5 }, (_, i) => (
          <div className="ff-gal-thumb" key={i}>
            <span className="cap">PHOTO · {trade.name.toLowerCase()} {i + 1}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
