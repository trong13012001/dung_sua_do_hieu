import Image from "next/image";

const LOGO_SRC = "/brand-logo.png";
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
};

/** Official brand mark trong /public. */
export function BrandLogo({
    className,
    priority,
    unoptimized = false,
}: BrandLogoProps) {
    return (
        <Image
            src={LOGO_SRC}
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
