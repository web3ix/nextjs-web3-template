import KnownInternalNames from "../../knownIds";
import {
	Balance,
	BalanceProps,
	BalanceProvider,
	NetworkBalancesProps,
} from "../../../models/Balance";
import { resolveBalance } from "./balance";
import { useSettingsState } from "../../../context/settings";

export default function useTonBalance(): BalanceProvider {
	const { networks } = useSettingsState();

	const supportedNetworks = [KnownInternalNames.Networks.TONMainnet];

	const getNetworkBalances = async ({
		networkName,
		address,
	}: NetworkBalancesProps) => {
		const network = networks.find((n) => n.name === networkName);

		let balances: Balance[] = [];

		if (!network?.tokens) return;

		for (let i = 0; i < network.tokens.length; i++) {
			try {
				const token = network.tokens[i];
				const balance = await resolveBalance({ network, address, token });

				if (!balance) return;

				balances = [...balances, balance];
			} catch (e) {
				console.log(e);
			}
		}

		return balances;
	};

	const getBalance = async ({ networkName, token, address }: BalanceProps) => {
		const network = networks.find((n) => n.name === networkName);

		if (!network) return;

		try {
			const balance = await resolveBalance({ network, address, token });
			return balance;
		} catch (e) {
			console.log(e);
		}
	};

	return {
		getNetworkBalances,
		getBalance,
		supportedNetworks,
	};
}
