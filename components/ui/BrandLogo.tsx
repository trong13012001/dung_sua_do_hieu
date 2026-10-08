import Image from "next/image";

const LOGO_SRC = "/brand-logo.png";
/**
 * Bản đen trắng 1-bit cho máy in nhiệt (cùng kích thước). Logo vàng gốc qua driver XP-80C để chế độ
 * ngưỡng (không dither) thì mất trắng; để dither thì chỉ ra khung chấm mờ. Đen thuần in rõ ở cả hai.
 */
const LOGO_THERMAL_SRC = "/brand-logo-thermal.png";
/** Kích thước thật của public/brand-logo.png — dùng đúng tỷ lệ cho layout & in */
const LOGO_INTRINSIC_W = 657;
const LOGO_INTRINSIC_H = 592;

type BrandLogoProps = {
    readonly className?: string;
    readonly priority?: boolean;
    /**
     * Bật trên hóa đơn in: tải PNG gốc, không qua /_next/image (tránh ảnh đã resize nhỏ bị phóng khi in → mờ).
     */
    readonly unoptimized?: boolean;
    /** Dùng bản đen trắng cho hóa đơn in nhiệt. */
    readonly thermal?: boolean;
};

/** Official brand mark trong /public. */
export function BrandLogo({
    className,
    priority,
    unoptimized = false,
    thermal = false,
}: BrandLogoProps) {
    return (
        <Image
            src={thermal ? LOGO_THERMAL_SRC : LOGO_SRC}
            alt="Dũng Sửa Đồ Hiệu"
            width={LOGO_INTRINSIC_W}
            height={LOGO_INTRINSIC_H}
            className={className}
            priority={priority}
            unoptimized={unoptimized}
            sizes={
                unoptimized
                    ? undefined
                    : "(max-width: 640px) 240px, 160px"
            }
        />
    );
}
