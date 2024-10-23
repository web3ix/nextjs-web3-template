import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { Network, NetworkType } from "../../../models/Network";
import { useSettingsState } from "../../../context/settings";
import { WalletProvider } from "../../../hooks/useWallet";
import KnownInternalNames from "../../knownIds";
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon";
import { evmConnectorNameResolver } from "./KnownEVMConnectors";
import { useEffect, useState } from "react";

export default function useEVM(): WalletProvider {
	const { networks } = useSettingsState();
	const [shouldConnect, setShouldConnect] = useState(false);
	const { disconnectAsync } = useDisconnect();

	const asSourceSupportedNetworks = [
		...networks
			.filter((network) => network.type === NetworkType.EVM)
			.map((l) => l.name),
		KnownInternalNames.Networks.ZksyncMainnet,
		KnownInternalNames.Networks.LoopringGoerli,
		KnownInternalNames.Networks.LoopringMainnet,
		KnownInternalNames.Networks.LoopringSepolia,
	];

	const withdrawalSupportedNetworks = [
		...asSourceSupportedNetworks,
		KnownInternalNames.Networks.ParadexMainnet,
		KnownInternalNames.Networks.ParadexTestnet,
	];

	const autofillSupportedNetworks = [
		...asSourceSupportedNetworks,
		KnownInternalNames.Networks.ImmutableXMainnet,
		KnownInternalNames.Networks.ImmutableXGoerli,
		KnownInternalNames.Networks.BrineMainnet,
	];

	const name = "evm";

	const account = useAccount();
	const { openConnectModal } = useConnectModal();

	useEffect(() => {
		if (shouldConnect) {
			connectWallet();
			setShouldConnect(false);
		}
	}, [shouldConnect]);

	const getWallet = (network?: Network) => {
		if (account && account.address && account.connector) {
			const connector = account.connector.id;
			if (
				connector == "com.immutable.passport" &&
				network &&
				!(
					network.name == KnownInternalNames.Networks.ImmutableZkEVM ||
					network.name == KnownInternalNames.Networks.ImmutableXMainnet
				)
			) {
				return undefined;
			}
			let roninWalletNetworks = [
				KnownInternalNames.Networks.RoninMainnet,
				KnownInternalNames.Networks.EthereumMainnet,
				KnownInternalNames.Networks.PolygonMainnet,
				KnownInternalNames.Networks.BNBChainMainnet,
				KnownInternalNames.Networks.ArbitrumMainnet,
			];

			if (
				connector == "com.roninchain.wallet" &&
				network &&
				!roninWalletNetworks.includes(network.name)
			) {
				return undefined;
			}
			return {
				address: account.address,
				connector:
					account.connector.name ||
					connector.charAt(0).toUpperCase() + connector.slice(1),
				providerName: name,
				icon: resolveWalletConnectorIcon({
					connector: evmConnectorNameResolver(account.connector),
					address: account.address,
				}),
			};
		}
	};

	const connectWallet = async () => {
		if (account && account.address && account.connector) {
			await reconnectWallet();
		} else {
			return openConnectModal && openConnectModal();
		}
	};

	const disconnectWallet = async () => {
		try {
			await disconnectAsync();
		} catch (e) {
			console.log(e);
		}
	};

	const reconnectWallet = async () => {
		try {
			await disconnectWallet();
			setShouldConnect(true);
		} catch (e) {
			console.log(e);
		}
	};

	return {
		getConnectedWallet: getWallet,
		connectWallet,
		disconnectWallet,
		reconnectWallet,
		autofillSupportedNetworks,
		withdrawalSupportedNetworks,
		asSourceSupportedNetworks,
		name,
	};
}
