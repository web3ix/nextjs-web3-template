import { useSettingsState } from "../../../context/settings";
import {
	Balance,
	BalanceProps,
	BalanceProvider,
	GasProps,
	NetworkBalancesProps,
} from "../../../models/Balance";
import { NetworkType } from "../../../models/Network";

export default function useEVMBalance(): BalanceProvider {
	const { networks } = useSettingsState();
	const supportedNetworks = networks
		.filter((l) => l.type === NetworkType.EVM && l.token)
		.map((l) => l.name);

	const getNetworkBalances = async ({
		networkName,
		address,
	}: NetworkBalancesProps) => {
		const network = networks.find((n) => n.name === networkName);

		if (!network) return;

		try {
			const resolveChain = (await import("../../resolveChain")).default;
			const chain = resolveChain(network);
			if (!chain) return;

			const { createPublicClient, http } = await import("viem");
			const publicClient = createPublicClient({
				chain,
				transport: http(),
			});

			const {
				getErc20Balances,
				getTokenBalance,
				resolveERC20Balances,
				resolveBalance,
			} = await import("./balance");

			const erc20BalancesContractRes = await getErc20Balances({
				address: address,
				assets: network.tokens,
				network,
				publicClient,
				hasMulticall: !!network.metadata?.evm_multicall_contract,
			});

			const erc20Balances =
				(erc20BalancesContractRes &&
					(await resolveERC20Balances(erc20BalancesContractRes, network))) ||
				[];

			const nativeTokens = network.tokens.filter((t) => !t.contract);
			const nativeBalances: Balance[] = [];

			for (let i = 0; i < nativeTokens.length; i++) {
				const token = nativeTokens[i];
				const nativeBalanceData = await getTokenBalance(
					address as `0x${string}`,
					network
				);
				const nativeBalance =
					nativeBalanceData &&
					(await resolveBalance(network, token, nativeBalanceData));
				if (nativeBalance) nativeBalances.push(nativeBalance);
			}

			let res: Balance[] = [];
			return res.concat(erc20Balances, nativeBalances);
		} catch (e) {
			console.log(e);
		}
	};

	const getBalance = async ({ networkName, token, address }: BalanceProps) => {
		const network = networks.find((n) => n.name === networkName);

		if (!network) return;

		try {
			const resolveChain = (await import("../../resolveChain")).default;
			const chain = resolveChain(network);
			if (!chain) return;

			const { getTokenBalance, resolveBalance, resolveERC20Balance } =
				await import("./balance");

			const balanceData = await getTokenBalance(
				address as `0x${string}`,
				network,
				token.contract as `0x${string}`
			);
			const balance =
				balanceData &&
				(network.token?.symbol === token.symbol
					? await resolveBalance(network, token, balanceData)
					: await resolveERC20Balance(network, token, balanceData));

			return balance;
		} catch (e) {
			console.log(e);
		}
	};

	const getGas = async ({
		network,
		address,
		token,
		isSweeplessTx,
		recipientAddress = "0x2fc617e933a52713247ce25730f6695920b3befe",
	}: GasProps) => {
		const networkFromSettings = networks.find((n) => n.name === network.name);

		const chainId = Number(network?.chain_id);

		if (
			!networkFromSettings ||
			!address ||
			isSweeplessTx === undefined ||
			!chainId ||
			!recipientAddress
		) {
			return;
		}

		const contract_address = token.contract as `0x${string}`;

		try {
			const { createPublicClient, http } = await import("viem");
			const resolveNetworkChain = (await import("../../resolveChain")).default;
			const publicClient = createPublicClient({
				chain: resolveNetworkChain(networkFromSettings),
				transport: http(),
			});

			const getEthereumGas = (await import("./gas/ethereum")).default;
			const getOptimismGas = (await import("./gas/optimism")).default;

			const getGas = network?.metadata?.evm_oracle_contract
				? getOptimismGas
				: getEthereumGas;

			const gasProvider = new getGas({
				publicClient,
				chainId,
				contract_address,
				account: address,
				from: network,
				currency: token,
				destination: recipientAddress as `0x${string}`,
				nativeToken: token,
				isSweeplessTx,
			});

			const gas = await gasProvider.resolveGas();

			return [gas!];
		} catch (e) {
			console.log(e);
		}
	};

	return {
		getNetworkBalances,
		getBalance,
		getGas,
		supportedNetworks,
	};
}
