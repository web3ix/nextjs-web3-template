"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { THEME_COLORS } from "@/models/Theme";
import RainbowKit from "./rainbowkit";
import Solana from "./solana";
import Ton from "./ton";

export default function Providers({ children }: { children: React.ReactNode }) {
	const path = usePathname();
	const params = useSearchParams();

	return (
		<Ton
			basePath={path}
			themeData={THEME_COLORS.default}
			appName={params.get("app") ?? ""}
		>
			<RainbowKit>
				<Solana>
					{/* <AsyncModalProvider>
						{process.env.NEXT_PUBLIC_IN_MAINTANANCE === "true" ? (
							<MaintananceContent />
						) : (
							children
						)}
					</AsyncModalProvider> */}
					{children}
				</Solana>
			</RainbowKit>
		</Ton>
	);
}
