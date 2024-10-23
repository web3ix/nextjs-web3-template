import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import {
	Balance,
	BalanceProps,
	BalanceProvider,
	Gas,
	GasProps,
	NetworkBalancesProps,
} from "../../../models/Balance";
import { useSettingsState } from "../../../context/settings";

export default function useSolanaBalance(): BalanceProvider {
	const { networks } = useSettingsState();

	const supportedNetworks = [KnownInternalNames.Networks.SolanaMainnet];

	const getNetworkBalances = async ({
		networkName,
		address,
	}: NetworkBalancesProps) => {
		const network = networks.find((n) => n.name === networkName);

		if (!address) return;

		const SolanaWeb3 = await import("@solana/web3.js");
		const { PublicKey, Connection } = SolanaWeb3;
		class SolanaConnection extends Connection {}
		const { getAssociatedTokenAddress } = await import("@solana/spl-token");
		const walletPublicKey = new PublicKey(address);
		let balances: Balance[] = [];

		if (!network?.tokens || !walletPublicKey) return;

		const connection = new SolanaConnection(`${network.node_url}`, "confirmed");

		async function getTokenBalanceWeb3(
			connection: SolanaConnection,
			tokenAccount
		) {
			const info = await connection.getTokenAccountBalance(tokenAccount);
			return info?.value?.uiAmount;
		}

		for (let i = 0; i < network.tokens.length; i++) {
			try {
				const asset = network.tokens[i];

				let result: number | null = null;

				if (asset.contract) {
					const sourceToken = new PublicKey(asset?.contract!);
					const associatedTokenFrom = await getAssociatedTokenAddress(
						sourceToken,
						walletPublicKey
					);
					if (!associatedTokenFrom) return;
					result = await getTokenBalanceWeb3(connection, associatedTokenFrom);
				} else {
					result = await connection.getBalance(walletPublicKey);
				}

				if (result != null && !isNaN(result)) {
					const balance = {
						network: network.name,
						token: asset.symbol,
						amount: result,
						request_time: new Date().toJSON(),
						decimals: Number(asset?.decimals),
						isNativeCurrency: false,
					};

					balances = [...balances, balance];
				}
			} catch (e) {
				console.log(e);
			}
		}

		return balances;
	};

	const getBalance = async ({ networkName, token, address }: BalanceProps) => {
		const network = networks.find((n) => n.name === networkName);

		if (!network) return;

		const SolanaWeb3 = await import("@solana/web3.js");
		const { PublicKey, Connection } = SolanaWeb3;
		class SolanaConnection extends Connection {}
		const { getAssociatedTokenAddress } = await import("@solana/spl-token");
		const walletPublicKey = new PublicKey(address);

		if (!walletPublicKey) return;

		const connection = new SolanaConnection(`${network.node_url}`, "confirmed");

		async function getTokenBalanceWeb3(
			connection: SolanaConnection,
			tokenAccount
		) {
			const info = await connection.getTokenAccountBalance(tokenAccount);
			return info?.value?.uiAmount;
		}

		let result: number | null = null;

		if (token.contract) {
			const sourceToken = new PublicKey(token?.contract);
			const associatedTokenFrom = await getAssociatedTokenAddress(
				sourceToken,
				walletPublicKey
			);
			if (!associatedTokenFrom) return;
			result = await getTokenBalanceWeb3(connection, associatedTokenFrom);
		} else {
			result = await connection.getBalance(walletPublicKey);
		}

		if (result != null && !isNaN(result)) {
			return {
				network: network.name,
				token: token.symbol,
				amount: result,
				request_time: new Date().toJSON(),
				decimals: Number(token?.decimals),
				isNativeCurrency: false,
			};
		}
	};

	const getGas = async ({ network, token, address }: GasProps) => {
		if (!address) return;
		const { PublicKey, Connection } = await import("@solana/web3.js");

		const walletPublicKey = new PublicKey(address);

		let gas: Gas[] = [];

		const connection = new Connection(`${network.node_url}`, "confirmed");

		if (!walletPublicKey) return;

		try {
			const transactionBuilder = (
				await import("../../wallets/solana/transactionBuilder")
			).default;

			const transaction = await transactionBuilder(
				network,
				token,
				walletPublicKey
			);

			if (!transaction || !network.token) return;

			const message = transaction.compileMessage();
			const result = await connection.getFeeForMessage(message);

			const formatedGas = formatAmount(result.value, network.token?.decimals);

			gas = [
				{
					token: token.symbol,
					gas: formatedGas,
					request_time: new Date().toJSON(),
				},
			];
		} catch (e) {
			console.log(e);
		}

		return gas;
	};

	return {
		getNetworkBalances,
		getBalance,
		getGas,
		supportedNetworks,
	};
}
