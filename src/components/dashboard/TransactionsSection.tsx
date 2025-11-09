import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Copy,
  ExternalLink,
  Wallet,
  Filter
} from "lucide-react";
import { useContractServices } from "@/hooks/useContractServices";
import { toast } from "sonner";

type TransactionType = "Stake" | "Unstake" | "Borrow" | "Repay" | "Claim" | "Mint";
type FilterType = "All" | TransactionType;

interface Transaction {
  id: string;
  type: TransactionType;
  asset: string;
  amount: string;
  date: string;
  hash: string;
  status: "Completed" | "Pending" | "Failed";
}

const TransactionsSection = () => {
  const [filter, setFilter] = useState<FilterType>("All");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [displayCount, setDisplayCount] = useState(20);

  const { isConnected, address } = useContractServices();

  // Mock transactions (TODO: Replace with actual blockchain event fetching)
  useEffect(() => {
    if (!isConnected || !address) {
      setTransactions([]);
      return;
    }

    // Mock data - In production, this would fetch from contract events
    const mockTransactions: Transaction[] = [
      {
        id: "1",
        type: "Stake",
        asset: "Invoice RWA",
        amount: "50.00",
        date: "2 hours ago",
        hash: "0x1234...5678",
        status: "Completed"
      },
      {
        id: "2",
        type: "Claim",
        asset: "T-Bills Vault",
        amount: "$45.00",
        date: "1 day ago",
        hash: "0xabcd...efgh",
        status: "Completed"
      },
      {
        id: "3",
        type: "Borrow",
        asset: "USDC",
        amount: "$1,200.00",
        date: "3 days ago",
        hash: "0x9876...5432",
        status: "Completed"
      },
      {
        id: "4",
        type: "Repay",
        asset: "USDC",
        amount: "$100.00",
        date: "5 days ago",
        hash: "0xfedc...ba98",
        status: "Completed"
      },
      {
        id: "5",
        type: "Mint",
        asset: "Invoice RWA",
        amount: "100.00",
        date: "1 week ago",
        hash: "0x1111...2222",
        status: "Completed"
      },
    ];

    setTransactions(mockTransactions);
  }, [isConnected, address]);

  const filteredTransactions = transactions.filter(tx =>
    filter === "All" ? true : tx.type === filter
  );

  const displayedTransactions = filteredTransactions.slice(0, displayCount);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success("Transaction hash copied!");
  };

  const handleViewOnExplorer = (hash: string) => {
    // TODO: Update with actual Stellar explorer URL
    const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${hash}`;
    window.open(explorerUrl, '_blank');
  };

  const getTypeColor = (type: TransactionType) => {
    const colors = {
      Stake: "bg-blue-100 text-blue-700",
      Unstake: "bg-orange-100 text-orange-700",
      Borrow: "bg-purple-100 text-purple-700",
      Repay: "bg-green-100 text-green-700",
      Claim: "bg-emerald-100 text-emerald-700",
      Mint: "bg-indigo-100 text-indigo-700"
    };
    return colors[type];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      Completed: "bg-green-100 text-green-700",
      Pending: "bg-yellow-100 text-yellow-700",
      Failed: "bg-red-100 text-red-700"
    };
    return colors[status as keyof typeof colors] || colors.Completed;
  };

  // Show connect wallet message if not connected
  if (!isConnected) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to view transactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="font-plus-jakarta text-xl font-semibold text-gray-900">
            Transaction History
          </h1>
        </div>
        <p className="font-plus-jakarta text-sm text-gray-600">
          All your blockchain activity
        </p>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-plus-jakarta text-sm text-gray-600 mr-2">Filter:</span>
          {(["All", "Stake", "Borrow", "Claim", "Repay", "Mint"] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-plus-jakarta transition-all ${
                filter === type
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {displayedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Yet</h3>
            <p className="text-sm text-gray-600">Your transaction history will appear here</p>
          </div>
        ) : (
          <>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[120px_180px_150px_150px_180px_80px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Asset</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Hash</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {displayedTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-[120px_180px_150px_150px_180px_80px] gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Type */}
                    <div>
                      <Badge className={`${getTypeColor(tx.type)} text-xs font-medium`}>
                        {tx.type}
                      </Badge>
                    </div>

                    {/* Asset */}
                    <div className="text-sm font-plus-jakarta text-gray-900">
                      {tx.asset}
                    </div>

                    {/* Amount */}
                    <div className="text-sm font-plus-jakarta font-semibold text-gray-900">
                      {tx.amount}
                    </div>

                    {/* Date */}
                    <div className="text-sm font-plus-jakarta text-gray-600">
                      {tx.date}
                    </div>

                    {/* Hash */}
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {tx.hash}
                      </code>
                      <button
                        onClick={() => handleCopyHash(tx.hash)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Copy hash"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleViewOnExplorer(tx.hash)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="View on explorer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                    </div>

                    {/* Status */}
                    <div>
                      <Badge className={`${getStatusColor(tx.status)} text-xs`}>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Load More */}
            {filteredTransactions.length > displayCount && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-3">
                  Showing {displayCount} of {filteredTransactions.length} transactions
                </p>
                <Button
                  onClick={() => setDisplayCount(prev => prev + 20)}
                  variant="outline"
                  className="font-plus-jakarta"
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionsSection;
